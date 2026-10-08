using System.Text.Json;
using StaticBlaze.Admin.Services;
using StaticBlaze.Core.Frontmatter;
using StaticBlaze.Core.Models;

namespace StaticBlaze.Admin.Services;

public sealed record AdminPost(string FileName, string Sha, PostFrontmatter Frontmatter, string Body)
{
    public bool IsNew => FileName is "";
}

/// <summary>Post + taxonomy CRUD over the GitHub contents API, frontmatter round-tripped through Core.</summary>
public sealed class PostService(GitHubApiClient github)
{
    private static readonly JsonSerializerOptions Json = StaticBlazeJson.Options;

    public async Task<List<AdminPost>> ListPostsAsync()
    {
        var files = (await github.ListAsync("posts")).Where(f => f.Name.EndsWith(".md")).OrderByDescending(f => f.Name);
        var posts = new List<AdminPost>();
        foreach (var file in files)
        {
            var content = await github.GetFileAsync($"posts/{file.Name}");
            if (content is null) continue;
            try
            {
                var (fm, body) = FrontmatterSerializer.Parse(content.DecodedContent, file.Name);
                posts.Add(new AdminPost(file.Name, content.Sha, fm, body));
            }
            catch (FrontmatterException)
            {
                posts.Add(new AdminPost(file.Name, content.Sha, new PostFrontmatter { Slug = file.Name.Replace(".md", "") }, content.DecodedContent));
            }
        }
        return posts;
    }

    public async Task<AdminPost?> GetPostAsync(string fileName)
    {
        var content = await github.GetFileAsync($"posts/{fileName}");
        if (content is null) return null;
        var (fm, body) = FrontmatterSerializer.Parse(content.DecodedContent, fileName);
        return new AdminPost(fileName, content.Sha, fm, body);
    }

    public async Task<string> SavePostAsync(AdminPost post, string commitMessage)
    {
        var markdown = FrontmatterSerializer.Serialize(post.Frontmatter, post.Body);
        return await github.PutFileAsync($"posts/{post.FileName}", markdown, commitMessage);
    }

    /// <summary>
    /// Ensures every tag and the category referenced by the post exist in the taxonomy files,
    /// appending the missing ones (slug + prettified title). The taxonomy must be declared
    /// before use, so a freshly typed tag would otherwise fail validation at generate time.
    /// Returns the number of terms appended (0 when everything already existed).
    /// </summary>
    public async Task<int> EnsureTaxonomyAsync(PostFrontmatter frontmatter)
    {
        var added = 0;

        var tags = await GetTermsAsync("tags");
        var knownTags = tags.Select(t => t.Slug).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var tag in frontmatter.Tags)
        {
            // normalise BEFORE the known check: a hand-typed "GitHub Actions" must match the
            // existing "github-actions" slug, not land beside it as a duplicate
            var slug = SlugFor(tag);
            if (slug.Length == 0 || knownTags.Contains(slug)) continue;
            tags.Add(new TaxonomyTerm { Slug = slug, Title = TitleFor(slug) });
            knownTags.Add(slug);
            added++;
        }
        if (added > 0) await SaveTermsAsync("tags", tags);

        if (!string.IsNullOrWhiteSpace(frontmatter.Category))
        {
            var categories = await GetTermsAsync("categories");
            if (categories.All(c => !string.Equals(c.Slug, frontmatter.Category, StringComparison.OrdinalIgnoreCase)))
            {
                categories.Add(new TaxonomyTerm { Slug = SlugFor(frontmatter.Category), Title = TitleFor(frontmatter.Category) });
                await SaveTermsAsync("categories", categories);
                added++;
            }
        }

        return added;
    }

    /// <summary>kebab-case slug for a term typed by hand: "GitHub Actions" -> "github-actions".</summary>
    internal static string SlugFor(string raw)
    {
        var slug = raw.Trim().ToLowerInvariant().Replace(' ', '-');
        var sb = new System.Text.StringBuilder(slug.Length);
        foreach (var c in slug)
        {
            if (char.IsAsciiLetterOrDigit(c)) sb.Append(c);
            else if (c is '-' or not ' ') sb.Append('-');
        }
        var result = sb.ToString();
        while (result.Contains("--")) result = result.Replace("--", "-");
        return result.Trim('-');
    }

    /// <summary>Human title for a hand-typed term: "github-actions" -> "Github Actions".</summary>
    internal static string TitleFor(string slug)
    {
        var title = slug.Replace('-', ' ');
        return string.Concat(title.Select((c, i) => i == 0 || title[i - 1] == ' ' ? char.ToUpperInvariant(c) : c));
    }

    /// <summary>Creates a new post file; returns the filename derived from date + slug.</summary>
    public async Task<string> CreatePostAsync(PostFrontmatter frontmatter, string body)
    {
        var fileName = $"{frontmatter.Published:yyyy-MM-dd}-{frontmatter.Slug}.md";
        var markdown = FrontmatterSerializer.Serialize(frontmatter, body);
        await github.PutFileAsync($"posts/{fileName}", markdown, $"create: {frontmatter.Slug}");
        return fileName;
    }

    public Task DeletePostAsync(AdminPost post) =>
        github.DeleteFileAsync($"posts/{post.FileName}", $"delete: {post.Frontmatter.Slug}");

    // ----- taxonomy -----

    public async Task<List<TaxonomyTerm>> GetTermsAsync(string file)
    {
        var content = await github.GetFileAsync($"taxonomy/{file}.json");
        return content is null ? [] : JsonSerializer.Deserialize<List<TaxonomyTerm>>(content.DecodedContent, Json) ?? [];
    }

    public async Task SaveTermsAsync(string file, List<TaxonomyTerm> terms) =>
        await github.PutFileAsync($"taxonomy/{file}.json", JsonSerializer.Serialize(terms, Json), $"update taxonomy: {file}");
}

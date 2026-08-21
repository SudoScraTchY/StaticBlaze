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

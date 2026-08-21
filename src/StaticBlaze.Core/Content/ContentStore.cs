using System.Text.Json;
using StaticBlaze.Core.Frontmatter;
using StaticBlaze.Core.Markdown;
using StaticBlaze.Core.Models;

namespace StaticBlaze.Core.Content;

/// <summary>
/// Loads the whole content/ tree from disk into typed objects.
/// This is the on-disk truth; the admin app has an API-backed counterpart.
/// </summary>
public static class ContentStore
{
    public static async Task<LoadedContent> LoadAsync(string contentRoot, CancellationToken ct = default)
    {
        contentRoot = Path.GetFullPath(contentRoot);

        var site = await LoadJson<SiteConfig>(Path.Combine(contentRoot, "site.json"), ct) ?? new SiteConfig();
        if (Uri.TryCreate(site.Url, UriKind.Absolute, out var siteUri))
            site.BasePath = siteUri.AbsolutePath.TrimEnd('/');
        var authors = new List<AuthorRecord>();
        var authorsDir = Path.Combine(contentRoot, "authors");
        if (Directory.Exists(authorsDir))
        {
            foreach (var file in Directory.EnumerateFiles(authorsDir, "*.json").Order())
                if (await LoadJson<AuthorRecord>(file, ct) is { } a)
                    authors.Add(a);
        }

        var tags = await LoadJson<List<TaxonomyTerm>>(Path.Combine(contentRoot, "taxonomy", "tags.json"), ct) ?? [];
        var categories = await LoadJson<List<TaxonomyTerm>>(Path.Combine(contentRoot, "taxonomy", "categories.json"), ct) ?? [];

        var posts = new List<Post>();
        var postsDir = Path.Combine(contentRoot, "posts");
        if (Directory.Exists(postsDir))
        {
            foreach (var file in Directory.EnumerateFiles(postsDir, "*.md").Order())
            {
                ct.ThrowIfCancellationRequested();
                posts.Add(await LoadPostAsync(file, ct));
            }
        }

        return new LoadedContent(contentRoot, site, authors, tags, categories, posts);
    }

    private static async Task<Post> LoadPostAsync(string file, CancellationToken ct)
    {
        var markdown = await File.ReadAllTextAsync(file, ct);
        var relative = Path.GetFileName(file);
        var (fm, body) = FrontmatterSerializer.Parse(markdown, relative);
        var (words, minutes) = ReadTime.Estimate(body);
        return new Post
        {
            SourceFile = relative,
            Frontmatter = fm,
            BodyMarkdown = body,
            Html = MarkdownPipelineFactory.ToHtml(body),
            WordCount = words,
            ReadTimeMinutes = minutes,
        };
    }

    private static async Task<T?> LoadJson<T>(string path, CancellationToken ct)
    {
        if (!File.Exists(path)) return default;
        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<T>(stream, StaticBlazeJson.Options, ct);
    }
}

public sealed record LoadedContent(
    string Root,
    SiteConfig Site,
    List<AuthorRecord> Authors,
    List<TaxonomyTerm> Tags,
    List<TaxonomyTerm> Categories,
    List<Post> Posts)
{
    public IEnumerable<Post> PublishedPosts => Posts
        .Where(p => !p.IsDraft)
        .OrderByDescending(p => p.Frontmatter.Published);

    public AuthorRecord? FindAuthor(string handle) =>
        Authors.FirstOrDefault(a => string.Equals(a.Handle, handle, StringComparison.OrdinalIgnoreCase));

    public TaxonomyTerm? FindTag(string slug) =>
        Tags.FirstOrDefault(t => string.Equals(t.Slug, slug, StringComparison.OrdinalIgnoreCase));

    public TaxonomyTerm? FindCategory(string slug) =>
        Categories.FirstOrDefault(c => string.Equals(c.Slug, slug, StringComparison.OrdinalIgnoreCase));
}

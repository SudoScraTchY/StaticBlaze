using System.Text.Json;
using StaticBlaze.Core.Content;
using StaticBlaze.Core.Indexing;
using StaticBlaze.Core.Models;
using Xunit;

namespace StaticBlaze.Core.Tests;

public class ValidationAndSearchTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "sb-tests", Guid.NewGuid().ToString("N"));

    private async Task<LoadedContent> BuildContent(Action<LoadedContent>? mutate = null)
    {
        Directory.CreateDirectory(Path.Combine(_root, "authors"));
        Directory.CreateDirectory(Path.Combine(_root, "taxonomy"));
        Directory.CreateDirectory(Path.Combine(_root, "posts"));

        await File.WriteAllTextAsync(Path.Combine(_root, "site.json"),
            JsonSerializer.Serialize(new SiteConfig { Title = "T", Url = "https://x.example", DefaultAuthor = "mehrshad" }, StaticBlazeJson.Options));
        await File.WriteAllTextAsync(Path.Combine(_root, "authors", "mehrshad.json"),
            JsonSerializer.Serialize(new AuthorRecord { Handle = "mehrshad", Name = "Mehrshad" }, StaticBlazeJson.Options));
        await File.WriteAllTextAsync(Path.Combine(_root, "taxonomy", "tags.json"),
            JsonSerializer.Serialize(new List<TaxonomyTerm> { new() { Slug = "blazor", Title = "Blazor" } }, StaticBlazeJson.Options));
        await File.WriteAllTextAsync(Path.Combine(_root, "taxonomy", "categories.json"),
            JsonSerializer.Serialize(new List<TaxonomyTerm> { new() { Slug = "dev", Title = "Dev" } }, StaticBlazeJson.Options));

        const string post = """
            ---
            title: "Post One: A Title"
            slug: post-one
            description: d
            author: mehrshad
            category: dev
            tags: [blazor]
            published: 2026-08-01T00:00:00Z
            ---
            # Heading

            Some *markdown* body.
            """;
        await File.WriteAllTextAsync(Path.Combine(_root, "posts", "2026-08-01-post-one.md"), post);

        var content = await ContentStore.LoadAsync(_root);
        mutate?.Invoke(content);
        return content;
    }

    [Fact]
    public async Task ValidContent_Passes()
    {
        var content = await BuildContent();
        Assert.Empty(ContentValidator.Validate(content));
    }

    [Fact]
    public async Task UnknownAuthorAndTag_AreReported()
    {
        var content = await BuildContent(c =>
            c.Posts[0].Frontmatter.Tags.Add("nonexistent"));
        // unknown author case
        var content2 = await BuildContent(c =>
            c.Posts[0].Frontmatter.Author = "ghost");
        var errors = ContentValidator.Validate(content);
        Assert.Contains(errors, e => e.Contains("'nonexistent'"));
        var errors2 = ContentValidator.Validate(content2);
        Assert.Contains(errors2, e => e.Contains("'ghost'"));
    }

    [Fact]
    public async Task DuplicateSlugs_AreReported()
    {
        var content = await BuildContent();
        content.Posts.Add(content.Posts[0] with { });
        var errors = ContentValidator.Validate(content);
        Assert.Contains(errors, e => e.Contains("duplicate slug"));
    }

    [Fact]
    public async Task SearchIndex_StripsMarkdownSyntax()
    {
        var content = await BuildContent();
        var index = SearchIndexBuilder.Build(content);
        var entry = Assert.Single(index);
        Assert.Equal("post-one", entry.Slug);
        Assert.Contains("Some markdown body", entry.Body);
        Assert.DoesNotContain("**", entry.Body);
        Assert.DoesNotContain("##", entry.Body);
    }

    [Fact]
    public async Task Drafts_ExcludedFromPublishedAndSearch()
    {
        var content = await BuildContent();
        Assert.Single(content.PublishedPosts);
        var draft = content.Posts[0];
        content.Posts.Add(new Post
        {
            SourceFile = "draft.md",
            Frontmatter = draft.Frontmatter with { Slug = "draft-post", Draft = true },
            BodyMarkdown = "", Html = "",
        });
        Assert.Single(content.PublishedPosts);
        Assert.Single(SearchIndexBuilder.Build(content));
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }
}

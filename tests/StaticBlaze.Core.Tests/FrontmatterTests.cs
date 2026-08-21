using StaticBlaze.Core.Frontmatter;
using StaticBlaze.Core.Models;
using Xunit;

namespace StaticBlaze.Core.Tests;

public class FrontmatterTests
{
    [Fact]
    public void Parse_ReadsTypicalPost()
    {
        var md = """
            ---
            title: A post about Blazor
            slug: a-post-about-blazor
            description: Some words
            author: mehrshad
            tags: [blazor, dotnet]
            category: dev
            published: 2026-08-21T10:00:00Z
            featured: true
            ---
            # Hello

            Body text.
            """;
        var (fm, body) = FrontmatterSerializer.Parse(md, "post.md");
        Assert.Equal("A post about Blazor", fm.Title);
        Assert.Equal(["blazor", "dotnet"], fm.Tags);
        Assert.Equal(DateTimeOffset.Parse("2026-08-21T10:00:00Z"), fm.Published);
        Assert.True(fm.Featured);
        Assert.False(fm.Draft);
        Assert.StartsWith("# Hello", body);
    }

    [Fact]
    public void RoundTrip_SurvivesColonsQuotesAndUnicode()
    {
        var fm = new PostFrontmatter
        {
            Title = "Post: with colons — and \"quotes\" and فارسی",
            Slug = "tricky-values",
            Description = "A: colon heavy: description",
            Author = "mehrshad",
            Category = "dev",
            Tags = ["c#", ".net", "پرشن"],
            Published = DateTimeOffset.Parse("2026-08-21T10:00:00Z"),
        };
        var serialized = FrontmatterSerializer.Serialize(fm, "Body **markdown**.");
        var (parsed, body) = FrontmatterSerializer.Parse(serialized, "x.md");
        Assert.Equal(fm.Title, parsed.Title);
        Assert.Equal(fm.Description, parsed.Description);
        Assert.Equal(fm.Tags, parsed.Tags);
        Assert.Equal(fm.Published, parsed.Published);
        Assert.Equal("Body **markdown**.", body);
    }

    [Fact]
    public void RoundTrip_KeepsDatesAndFlags()
    {
        var fm = new PostFrontmatter
        {
            Title = "t", Slug = "s", Description = "d", Author = "a", Category = "c",
            Published = DateTimeOffset.Parse("2026-01-02T03:04:05Z"),
            Modified = DateTimeOffset.Parse("2026-02-03T04:05:06Z"),
            Draft = true,
            Featured = true,
        };
        var (parsed, _) = FrontmatterSerializer.Parse(FrontmatterSerializer.Serialize(fm, "b"), "x");
        Assert.Equal(fm.Modified, parsed.Modified);
        Assert.True(parsed.Draft);
        Assert.True(parsed.Featured);
    }

    [Fact]
    public void Parse_MissingFrontmatter_ThrowsWithSource()
    {
        var ex = Assert.Throws<FrontmatterException>(
            () => FrontmatterSerializer.Parse("no frontmatter here", "bad.md"));
        Assert.Contains("bad.md", ex.Message);
    }

    [Fact]
    public void Parse_BadYaml_ThrowsWithSource()
    {
        var ex = Assert.Throws<FrontmatterException>(
            () => FrontmatterSerializer.Parse("---\ntitle: [unclosed\n---\nbody", "bad2.md"));
        Assert.Contains("bad2.md", ex.Message);
    }
}

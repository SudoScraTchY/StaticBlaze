using System.Text.Json;
using System.Text.Json.Serialization;

namespace StaticBlaze.Core.Models;

public sealed class SiteConfig
{
    public string Title { get; set; } = "My Blog";
    public string Description { get; set; } = "";
    public string Url { get; set; } = "";
    public string Language { get; set; } = "en";
    public int PostsPerPage { get; set; } = 10;
    public int FeedPostCount { get; set; } = 20;
    public string Wordmark { get; set; } = "";
    public string DefaultAuthor { get; set; } = "";
    public List<NavLink> Nav { get; set; } = [];

    /// <summary>Path prefix when hosted under a subpath (e.g. "/StaticBlaze" for
    /// user.github.io/repo). Derived from <see cref="Url"/> at load time; empty for root hosting.</summary>
    public string BasePath { get; set; } = "";
}

public sealed class NavLink
{
    public string Label { get; set; } = "";
    public string Href { get; set; } = "";
}

public sealed class AuthorRecord
{
    public string Handle { get; set; } = "";
    public string Name { get; set; } = "";
    public string Bio { get; set; } = "";
    public string? Avatar { get; set; }
    public string? Website { get; set; }
    public Dictionary<string, string> Social { get; set; } = new();
}

public sealed class TaxonomyTerm
{
    public string Slug { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
}

public sealed record PostFrontmatter
{
    public string Title { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Description { get; set; } = "";
    public string Author { get; set; } = "";
    public string Category { get; set; } = "";
    public string? Thumbnail { get; set; }
    public List<string> Tags { get; set; } = [];
    public DateTimeOffset Published { get; set; }
    public DateTimeOffset? Modified { get; set; }
    public bool Featured { get; set; }
    public bool Draft { get; set; }
}

public sealed record Post
{
    public required string SourceFile { get; init; }
    public required PostFrontmatter Frontmatter { get; init; }
    public required string BodyMarkdown { get; init; }
    public required string Html { get; init; }

    public string Slug => Frontmatter.Slug;
    public string Url => $"/posts/{Frontmatter.Slug}/";
    public string Title => Frontmatter.Title;
    public bool IsDraft => Frontmatter.Draft;
    public int WordCount { get; init; }
    public int ReadTimeMinutes { get; init; }
}

public sealed class PostSummary
{
    public string Slug { get; set; } = "";
    public string Url { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string AuthorHandle { get; set; } = "";
    public string AuthorName { get; set; } = "";
    public string? AuthorAvatar { get; set; }
    public List<string> Tags { get; set; } = [];
    public string Category { get; set; } = "";
    public string? Thumbnail { get; set; }
    public DateTimeOffset Published { get; set; }
    public DateTimeOffset? Modified { get; set; }
    public int ReadTimeMinutes { get; set; }
    public bool Featured { get; set; }
    public List<string> Related { get; set; } = [];
}

public sealed class TermCount
{
    public string Slug { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public int Count { get; set; }
}

public sealed class Manifest
{
    public DateTimeOffset GeneratedAt { get; set; }
    public SiteConfig Site { get; set; } = new();
    public List<PostSummary> Posts { get; set; } = [];
    public List<TermCount> Tags { get; set; } = [];
    public List<TermCount> Categories { get; set; } = [];
    public List<AuthorRecord> Authors { get; set; } = [];
}

public sealed class SearchEntry
{
    public string Slug { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public List<string> Tags { get; set; } = [];
    public string Category { get; set; } = "";
    public DateTimeOffset Published { get; set; }
    public string Body { get; set; } = "";
}

public static class StaticBlazeJson
{
    public static JsonSerializerOptions Options { get; } = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false,
    };
}

using StaticBlaze.Core.Content;
using StaticBlaze.Core.Frontmatter;

namespace StaticBlaze.Core.Content;

/// <summary>
/// Fails the build with actionable errors instead of shipping a broken site.
/// Every rule returns "file: problem" so a bad post is one-glance fixable.
/// </summary>
public static class ContentValidator
{
    public static List<string> Validate(LoadedContent content)
    {
        var errors = new List<string>();
        var site = content.Site;

        if (string.IsNullOrWhiteSpace(site.Url) || !Uri.TryCreate(site.Url, UriKind.Absolute, out _))
            errors.Add("site.json: 'url' must be an absolute URL (used for canonical/sitemap/RSS)");
        if (string.IsNullOrWhiteSpace(site.Title))
            errors.Add("site.json: 'title' is required");

        var slugs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var post in content.Posts)
        {
            var name = post.SourceFile;

            if (string.IsNullOrWhiteSpace(post.Frontmatter.Title))
                errors.Add($"{name}: frontmatter 'title' is required");
            if (string.IsNullOrWhiteSpace(post.Frontmatter.Description))
                errors.Add($"{name}: frontmatter 'description' is required");
            if (string.IsNullOrWhiteSpace(post.Frontmatter.Author))
                errors.Add($"{name}: frontmatter 'author' is required");
            else if (content.FindAuthor(post.Frontmatter.Author) is null)
                errors.Add($"{name}: author '{post.Frontmatter.Author}' has no authors/{{handle}}.json file");
            if (string.IsNullOrWhiteSpace(post.Frontmatter.Category))
                errors.Add($"{name}: frontmatter 'category' is required");
            else if (content.FindCategory(post.Frontmatter.Category) is null)
                errors.Add($"{name}: category '{post.Frontmatter.Category}' is not defined in taxonomy/categories.json");
            if (post.Frontmatter.Published == default)
                errors.Add($"{name}: frontmatter 'published' is required (ISO 8601)");
            if (string.IsNullOrWhiteSpace(post.Frontmatter.Slug))
                errors.Add($"{name}: frontmatter 'slug' is required");
            else if (!slugs.Add(post.Frontmatter.Slug))
                errors.Add($"{name}: duplicate slug '{post.Frontmatter.Slug}'");

            foreach (var tag in post.Frontmatter.Tags)
                if (content.FindTag(tag) is null)
                    errors.Add($"{name}: tag '{tag}' is not defined in taxonomy/tags.json");

            if (post.Frontmatter.Thumbnail is { } thumb && !File.Exists(Path.Combine(content.Root, thumb)))
                errors.Add($"{name}: thumbnail '{thumb}' not found under content/");
        }

        return errors;
    }

    public static void EnsureValid(LoadedContent content)
    {
        var errors = Validate(content);
        if (errors.Count > 0)
            throw new ContentValidationException(errors);
    }
}

public sealed class ContentValidationException(IEnumerable<string> errors)
    : Exception($"Content validation failed:\n  - {string.Join("\n  - ", errors)}")
{
    public List<string> Errors { get; } = [.. errors];
}

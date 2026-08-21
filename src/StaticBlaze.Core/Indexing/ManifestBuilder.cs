using StaticBlaze.Core.Content;
using StaticBlaze.Core.Models;

namespace StaticBlaze.Core.Indexing;

/// <summary>
/// Builds the fetch-once manifest: ordered post index, per-post related links
/// (tag overlap x2 + same category +1, recency tiebreak), and term counts.
/// All counts are computed here and nowhere else, so they can never drift.
/// </summary>
public static class ManifestBuilder
{
    public const int RelatedCount = 3;

    public static Manifest Build(LoadedContent content, DateTimeOffset? generatedAt = null)
    {
        var posts = content.PublishedPosts.ToList();

        var summaries = posts.Select(p => new PostSummary
        {
            Slug = p.Slug,
            Url = p.Url,
            Title = p.Title,
            Description = p.Frontmatter.Description,
            AuthorHandle = p.Frontmatter.Author,
            AuthorName = content.FindAuthor(p.Frontmatter.Author)?.Name ?? p.Frontmatter.Author,
            AuthorAvatar = content.FindAuthor(p.Frontmatter.Author)?.Avatar,
            Tags = [.. p.Frontmatter.Tags],
            Category = p.Frontmatter.Category,
            Thumbnail = p.Frontmatter.Thumbnail,
            Published = p.Frontmatter.Published,
            Modified = p.Frontmatter.Modified,
            ReadTimeMinutes = p.ReadTimeMinutes,
            Featured = p.Frontmatter.Featured,
        }).ToList();

        var bySlug = summaries.ToDictionary(s => s.Slug, StringComparer.OrdinalIgnoreCase);
        foreach (var post in posts)
        {
            var related = posts
                .Where(o => !ReferenceEquals(o, post))
                .Select(o => (Other: o, Score: Score(post, o)))
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .ThenByDescending(x => x.Other.Frontmatter.Published)
                .Take(RelatedCount)
                .Select(x => x.Other.Slug)
                .ToList();
            bySlug[post.Slug].Related = related;
        }

        return new Manifest
        {
            GeneratedAt = generatedAt ?? DateTimeOffset.UtcNow,
            Site = content.Site,
            Posts = summaries,
            Tags = CountTerms(content.Tags, posts.Select(p => p.Frontmatter.Tags)),
            Categories = CountTerms(content.Categories, posts.Select(p => new[] { p.Frontmatter.Category })),
            Authors = content.Authors,
        };
    }

    internal static int Score(Post post, Post other)
    {
        var score = 2 * post.Frontmatter.Tags.Intersect(other.Frontmatter.Tags, StringComparer.OrdinalIgnoreCase).Count();
        if (string.Equals(post.Frontmatter.Category, other.Frontmatter.Category, StringComparison.OrdinalIgnoreCase))
            score += 1;
        return score;
    }

    private static List<TermCount> CountTerms(IEnumerable<TaxonomyTerm> terms, IEnumerable<IEnumerable<string>> usedPerPost)
    {
        var usage = usedPerPost.SelectMany(x => x).GroupBy(x => x, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Count(), StringComparer.OrdinalIgnoreCase);
        return terms
            .Select(t => new TermCount { Slug = t.Slug, Title = t.Title, Description = t.Description, Count = usage.GetValueOrDefault(t.Slug) })
            .OrderByDescending(t => t.Count)
            .ThenBy(t => t.Slug, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public static List<List<PostSummary>> Paginate(List<PostSummary> posts, int pageSize) =>
        Enumerable.Range(0, (posts.Count + pageSize - 1) / Math.Max(1, pageSize))
            .Select(i => posts.Skip(i * pageSize).Take(pageSize).ToList())
            .ToList();
}

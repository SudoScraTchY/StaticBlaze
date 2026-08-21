using StaticBlaze.Core.Indexing;
using StaticBlaze.Core.Models;
using Xunit;

namespace StaticBlaze.Core.Tests;

public class ManifestBuilderTests
{
    private static PostSummary S(string slug, DateTimeOffset published, string[] tags, string category, bool featured = false) => new()
    {
        Slug = slug, Title = slug, Published = published, Tags = [.. tags], Category = category, Featured = featured,
    };

    [Fact]
    public void Paginate_SlicesCorrectly()
    {
        var posts = Enumerable.Range(1, 25).Select(i =>
            S($"p{i:00}", DateTimeOffset.UtcNow.AddDays(-i), [], "dev")).ToList();
        var pages = ManifestBuilder.Paginate(posts, 10);
        Assert.Equal(3, pages.Count);
        Assert.Equal(10, pages[0].Count);
        Assert.Equal(5, pages[2].Count);
    }

    [Fact]
    public void Related_TagOverlapBeatsCategory_RecencyBreaksTies()
    {
        var posts = new List<Post>
        {
            Post("alpha", ["blazor", "wasm"], "dev", daysAgo: 10),
            Post("bravo", ["blazor", "wasm", "ci"], "other", daysAgo: 5),
            Post("charlie", ["blazor"], "dev", daysAgo: 3),
            Post("delta", ["wasm"], "other", daysAgo: 1),
            Post("unrelated", ["rust"], "life", daysAgo: 1),
        };

        // alpha vs bravo: 2 shared tags = 4; vs charlie: 1 tag + category = 3; vs delta: 1 tag = 2; vs unrelated: 0
        var scores = posts.Where(p => p.Slug != "alpha")
            .Select(p => (p.Slug, Score: ManifestBuilder.Score(posts[0], p)))
            .ToDictionary(x => x.Slug, x => x.Score);
        Assert.Equal(4, scores["bravo"]);
        Assert.Equal(3, scores["charlie"]);
        Assert.Equal(2, scores["delta"]);
        Assert.Equal(0, scores["unrelated"]);
    }

    private static Post Post(string slug, string[] tags, string category, int daysAgo) => new()
    {
        SourceFile = $"{slug}.md",
        Frontmatter = new PostFrontmatter
        {
            Slug = slug, Title = slug, Description = "d", Author = "a", Category = category,
            Tags = [.. tags], Published = DateTimeOffset.UtcNow.AddDays(-daysAgo),
        },
        BodyMarkdown = "", Html = "",
    };
}

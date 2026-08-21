using StaticBlaze.Core.Content;
using StaticBlaze.Core.Markdown;
using StaticBlaze.Core.Models;

namespace StaticBlaze.Core.Indexing;

/// <summary>Emits the lazy-loaded client search index: plain-text bodies, no markdown syntax.</summary>
public static class SearchIndexBuilder
{
    public static List<SearchEntry> Build(LoadedContent content)
    {
        var entries = new List<SearchEntry>();
        foreach (var post in content.PublishedPosts)
        {
            var body = MarkdownPipelineFactory.ToPlainText(post.BodyMarkdown);
            entries.Add(new SearchEntry
            {
                Slug = post.Slug,
                Title = post.Title,
                Description = post.Frontmatter.Description,
                Tags = [.. post.Frontmatter.Tags],
                Category = post.Frontmatter.Category,
                Published = post.Frontmatter.Published,
                Body = body,
            });
        }
        return entries;
    }
}

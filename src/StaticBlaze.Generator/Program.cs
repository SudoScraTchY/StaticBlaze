using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using StaticBlaze.Core.Content;
using StaticBlaze.Core.Indexing;
using StaticBlaze.Core.Models;
using StaticBlaze.Site.Components;
using StaticBlaze.Site.Components.Pages;

// ----- args -----
var contentDir = GetArg(args, "--content") ?? "content";
var outDir = GetArg(args, "--out") ?? "dist";
var fontsDir = GetArg(args, "--fonts") ?? "styles/fonts";
var staticDir = GetArg(args, "--static") ?? "styles/static";
var vendorDir = GetArg(args, "--vendor") ?? "styles/vendor";
var cssPath = GetArg(args, "--css");

// ----- load + validate (bad content fails the build, never the site) -----
var content = await ContentStore.LoadAsync(contentDir);
ContentValidator.EnsureValid(content);
var site = content.Site;
var manifest = ManifestBuilder.Build(content);
var search = SearchIndexBuilder.Build(content);
var posts = content.PublishedPosts.ToList();
Console.WriteLine($"Loaded {content.Posts.Count} posts ({posts.Count} published), {content.Tags.Count} tags, {content.Categories.Count} categories.");

// ----- output root -----
if (Directory.Exists(outDir)) Directory.Delete(outDir, recursive: true);
Directory.CreateDirectory(outDir);

// ----- Blazor-as-template-engine -----
var services = new ServiceCollection();
services.AddLogging();
await using var provider = services.BuildServiceProvider();
await using var renderer = new HtmlRenderer(provider, provider.GetRequiredService<ILoggerFactory>());

var written = 0;
async Task WritePageAsync(string relativePath, Task<string> render)
{
    var path = Path.Combine(outDir, relativePath);
    Directory.CreateDirectory(Path.GetDirectoryName(path)!);
    await File.WriteAllTextAsync(path, await render);
    written++;
}

Task<string> Render<TComponent>(IDictionary<string, object?> parameters) where TComponent : IComponent =>
    renderer.Dispatcher.InvokeAsync(async () =>
    {
        var root = renderer.BeginRenderingComponent<TComponent>(ParameterView.FromDictionary(parameters));
        await root.QuiescenceTask;
        return root.ToHtmlString();
    });

var summaryBySlug = manifest.Posts.ToDictionary(p => p.Slug, StringComparer.OrdinalIgnoreCase);
var topTags = manifest.Tags.Where(t => t.Count > 0).OrderByDescending(t => t.Count).ThenBy(t => t.Slug).ToList();

// ----- payloads the 3D layer and the palaces read -----
// The field is the archive, so the scene gets the real posts, not decoration.
static string Encode(object payload) =>
    JsonSerializer.Serialize(payload).Replace("<", "\\u003c");

object ScenePayload(PostSummary? current = null)
{
    var list = manifest.Posts.Select(p => new
    {
        slug = p.Slug,
        title = p.Title,
        tags = p.Tags,
        category = p.Category,
        published = p.Published.ToString("yyyy-MM-dd"),
        featured = p.Featured,
    }).ToArray();

    if (current is null) return new { posts = list };
    return new
    {
        posts = list,
        post = new { slug = current.Slug, tags = current.Tags, wordCount = current.ReadTimeMinutes * 200 },
    };
}

string SceneJson(PostSummary? current = null) => Encode(ScenePayload(current));

// The interactive related-posts graph on the post page. LinkedPostsOf extracts every internal post
// link from the rendered article body (so it can never drift from what the reader sees); the JSON
// payload hands graph.js the same set, with the current post as the central node.
List<PostSummary> LinkedPostsOf(Post post)
{
    var bySlug = manifest.Posts.ToDictionary(p => p.Slug, StringComparer.OrdinalIgnoreCase);
    var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { post.Slug };
    var links = new List<PostSummary>();
    // href may be "/posts/slug/" or "/StaticBlaze/posts/slug/": capture the trailing slug segment.
    foreach (Match m in Regex.Matches(post.Html, @"href=""(?:[^""]*)/posts/([^/""]+)/""", RegexOptions.IgnoreCase))
    {
        var slug = m.Groups[1].Value;
        if (!seen.Add(slug)) continue;                 // dedupe + drop self-links
        if (bySlug.TryGetValue(slug, out var target)) links.Add(target);  // only real posts become nodes
    }
    return links;
}
string PostGraphJson(Post post, SiteConfig site, List<PostSummary> links) => Encode(new
{
    self = new { slug = post.Slug, title = post.Title, url = site.BasePath + post.Url },
    links = links.Select(t => new { slug = t.Slug, title = t.Title, url = site.BasePath + t.Url }).ToArray(),
});
string PostsJson() => Encode(new
{
    posts = manifest.Posts.Select(p => new { slug = p.Slug, title = p.Title, tags = p.Tags, category = p.Category, published = p.Published.ToString("yyyy-MM-dd") }).ToArray(),
});

var sharedPosts = PostsJson();
var sharedScene = SceneJson();

// ----- landing pages -----
var pages = ManifestBuilder.Paginate(manifest.Posts, site.PostsPerPage);
var featured = manifest.Posts.Where(p => p.Featured).Take(4).ToList();
for (var i = 0; i < pages.Count; i++)
{
    var page = i + 1;
    var path = page == 1 ? "index.html" : $"page/{page}/index.html";
    await WritePageAsync(path, Render<LandingPage>(new Dictionary<string, object?>
    {
        ["Site"] = site,
        ["Page"] = page,
        ["TotalPages"] = pages.Count,
        ["Posts"] = pages[i],
        ["Featured"] = featured,
        ["AllPosts"] = manifest.Posts,
        ["TagCount"] = manifest.Tags.Count,
        ["TopTags"] = topTags,
        ["SceneData"] = sharedScene,
        ["PostsJson"] = sharedPosts,
    }));
}

// ----- the full filterable index (new surface) -----
await WritePageAsync("posts/index.html", Render<PostsIndexPage>(new Dictionary<string, object?>
{
    ["Site"] = site,
    ["Posts"] = manifest.Posts,
    ["Tags"] = topTags,
    ["Categories"] = manifest.Categories.Where(c => c.Count > 0).ToList(),
    ["SceneData"] = sharedScene,
    ["PostsJson"] = sharedPosts,
}));

// ----- post pages -----
foreach (var post in posts)
{
    var related = post.Frontmatter.Tags.Count == 0 && string.IsNullOrEmpty(post.Frontmatter.Category)
        ? new List<PostSummary>()
        : [.. post.Frontmatter.Tags
            .SelectMany(tag => manifest.Posts.Where(p => p.Slug != post.Slug && p.Tags.Contains(tag, StringComparer.OrdinalIgnoreCase)))
            .Concat(manifest.Posts.Where(p => p.Slug != post.Slug && string.Equals(p.Category, post.Frontmatter.Category, StringComparison.OrdinalIgnoreCase)))
            .DistinctBy(p => p.Slug)
            .OrderByDescending(p => p.Published)
            .Take(ManifestBuilder.RelatedCount)];
    if (summaryBySlug.TryGetValue(post.Slug, out var self) && self.Related.Count > 0)
        related = [.. self.Related.Where(r => summaryBySlug.ContainsKey(r)).Select(r => summaryBySlug[r])];

    var categoryTitle = content.FindCategory(post.Frontmatter.Category)?.Title ?? post.Frontmatter.Category;
    var graphLinks = LinkedPostsOf(post);
    await WritePageAsync($"{post.Url.TrimStart('/')}/index.html".Replace("//", "/"), Render<PostPage>(new Dictionary<string, object?>
    {
        ["Site"] = site,
        ["Post"] = post,
        ["Author"] = content.FindAuthor(post.Frontmatter.Author),
        ["CategoryTitle"] = categoryTitle,
        ["Related"] = related,
        ["SceneData"] = SceneJson(summaryBySlug.TryGetValue(post.Slug, out var s) ? s : null),
        ["Comments"] = site.Comments,
        ["LinkedPosts"] = graphLinks,
        ["PostGraph"] = PostGraphJson(post, site, graphLinks),
        ["PostsJson"] = sharedPosts,
    }));
}

// ----- taxonomy index + term pages -----
// Only terms that actually have posts get a page (see the term loop below). Listing a term that was
// never emitted produced a link to a 404 and a sitemap entry for a page that does not exist.
var usedTags = manifest.Tags.Where(t => t.Count > 0).ToList();
var usedCategories = manifest.Categories.Where(c => c.Count > 0).ToList();
await WritePageAsync("tags/index.html", Render<TermsIndexPage>(Params(site, "tags", "Tags", usedTags, sharedScene, sharedPosts)));
await WritePageAsync("categories/index.html", Render<TermsIndexPage>(Params(site, "categories", "Categories", usedCategories, sharedScene, sharedPosts)));

foreach (var (kind, label, terms) in new[] { ("tags", "Tag", manifest.Tags), ("categories", "Category", manifest.Categories) })
{
    foreach (var term in terms.Where(t => t.Count > 0))
    {
        var termPosts = manifest.Posts.Where(p =>
            kind == "tags"
                ? p.Tags.Contains(term.Slug, StringComparer.OrdinalIgnoreCase)
                : string.Equals(p.Category, term.Slug, StringComparison.OrdinalIgnoreCase)).ToList();
        var termPages = ManifestBuilder.Paginate(termPosts, site.PostsPerPage);
        for (var i = 0; i < termPages.Count; i++)
        {
            var page = i + 1;
            var path = page == 1 ? $"{kind}/{term.Slug}/index.html" : $"{kind}/{term.Slug}/page/{page}/index.html";
            await WritePageAsync(path, Render<TermPage>(new Dictionary<string, object?>
            {
                ["Site"] = site,
                ["Kind"] = kind,
                ["Label"] = label,
                ["Term"] = new TaxonomyTerm { Slug = term.Slug, Title = term.Title, Description = term.Description },
                ["Count"] = term.Count,
                ["Posts"] = termPages[i],
                ["Page"] = page,
                ["TotalPages"] = termPages.Count,
                ["SceneData"] = sharedScene,
                ["PostsJson"] = sharedPosts,
            }));
        }
    }
}

// ----- author + about + archive + contact + 404 -----
foreach (var author in content.Authors)
{
    var authorPosts = manifest.Posts.Where(p => string.Equals(p.AuthorHandle, author.Handle, StringComparison.OrdinalIgnoreCase)).ToList();
    await WritePageAsync($"authors/{author.Handle}/index.html", Render<AuthorPage>(new Dictionary<string, object?>
    {
        ["Site"] = site, ["Author"] = author, ["Posts"] = authorPosts,
        ["SceneData"] = sharedScene, ["PostsJson"] = sharedPosts,
    }));
}

if (content.FindAuthor(site.DefaultAuthor) is { } about)
{
    var aboutPosts = manifest.Posts.Where(p => string.Equals(p.AuthorHandle, about.Handle, StringComparison.OrdinalIgnoreCase)).ToList();
    await WritePageAsync("about/index.html", Render<AuthorPage>(new Dictionary<string, object?>
    {
        ["Site"] = site, ["Author"] = about, ["Posts"] = aboutPosts,
        ["CanonicalOverride"] = "/about/",
        ["TitleOverride"] = "About",
        ["DescriptionOverride"] = $"How {about.Name} works and what this blog is for. Notes on .NET, Blazor and static sites, built with a generator that lives in the repository.",
        ["SceneData"] = sharedScene, ["PostsJson"] = sharedPosts,
    }));
}

await WritePageAsync("archive/index.html", Render<ArchivePage>(new Dictionary<string, object?>
{
    ["Site"] = site, ["Posts"] = manifest.Posts, ["SceneData"] = sharedScene, ["PostsJson"] = sharedPosts,
}));

await WritePageAsync("contact/index.html", Render<ContactPage>(new Dictionary<string, object?>
{
    ["Site"] = site,
        ["Contact"] = site.Contact, ["SceneData"] = sharedScene, ["PostsJson"] = sharedPosts,
}));

await WritePageAsync("404.html", Render<NotFoundPage>(new Dictionary<string, object?>
{
    ["Site"] = site,
}));

// ----- machine artifacts -----
await File.WriteAllTextAsync(Path.Combine(outDir, "manifest.json"), JsonSerializer.Serialize(manifest, StaticBlazeJson.Options));
await File.WriteAllTextAsync(Path.Combine(outDir, "search-index.json"), JsonSerializer.Serialize(search, StaticBlazeJson.Options));
await File.WriteAllTextAsync(Path.Combine(outDir, "rss.xml"), Feeds.Rss(site, manifest));
await File.WriteAllTextAsync(Path.Combine(outDir, "atom.xml"), Feeds.Atom(site, manifest));
await File.WriteAllTextAsync(Path.Combine(outDir, "sitemap.xml"), Feeds.Sitemap(site, manifest));
await File.WriteAllTextAsync(Path.Combine(outDir, "robots.txt"), $"User-agent: *\nAllow: /\n\nSitemap: {site.Url.TrimEnd('/')}/sitemap.xml\n");

// ----- static assets: content assets, fonts, visitor js, vendored libraries -----
CopyDirectory(Path.Combine(contentDir, "assets"), Path.Combine(outDir, "assets"));
CopyDirectory(fontsDir, Path.Combine(outDir, "assets", "fonts"));
CopyDirectory(staticDir, Path.Combine(outDir, "assets"));
CopyDirectory(vendorDir, Path.Combine(outDir, "assets", "vendor"));

// ----- optional: the built stylesheet (the CI workflow does this itself) -----
if (!string.IsNullOrWhiteSpace(cssPath))
{
    if (File.Exists(cssPath))
    {
        var target = Path.Combine(outDir, "assets", "site.css");
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        File.Copy(cssPath, target, overwrite: true);
        Console.WriteLine($"Stylesheet copied: {cssPath} -> {target}");
    }
    else
    {
        Console.Error.WriteLine($"warning: --css was given but '{cssPath}' does not exist; dist/assets/site.css was not written.");
    }
}
else
{
    Console.WriteLine("note: no --css given, so dist/assets/site.css was not written (the site will render unstyled).");
}

Console.WriteLine($"Site generated: {written} pages + feeds into {Path.GetFullPath(outDir)}");
return 0;

// ----- helpers -----
static string? GetArg(string[] args, string name)
{
    var index = Array.IndexOf(args, name);
    return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
}

static Dictionary<string, object?> Params(SiteConfig site, string kind, string label, List<TermCount> terms, string scene, string postsJson) => new()
{
    ["Site"] = site, ["Kind"] = kind, ["Label"] = label, ["Terms"] = terms,
    ["SceneData"] = scene, ["PostsJson"] = postsJson,
};

static void CopyDirectory(string source, string destination)
{
    if (!Directory.Exists(source)) return;
    foreach (var file in Directory.EnumerateFiles(source, "*", SearchOption.AllDirectories))
    {
        var target = Path.Combine(destination, Path.GetRelativePath(source, file));
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        File.Copy(file, target, overwrite: true);
    }
}

internal static class Feeds
{
    private static XNamespace AtomNs => "http://www.w3.org/2005/Atom";

    public static string Rss(SiteConfig site, Manifest manifest)
    {
        var baseUri = site.Url.TrimEnd('/');
        var channel = new XElement("channel",
            new XElement("title", site.Title),
            new XElement("link", baseUri + "/"),
            new XElement("description", site.Description),
            new XElement("lastBuildDate", DateTimeOffset.UtcNow.ToString("R")),
            manifest.Posts.Take(site.FeedPostCount).Select(p => new XElement("item",
                new XElement("title", p.Title),
                new XElement("link", baseUri + p.Url),
                new XElement("guid", baseUri + p.Url),
                new XElement("pubDate", p.Published.ToString("R")),
                new XElement("description", p.Description))));
        var doc = new XDocument(new XDeclaration("1.0", "utf-8", null), new XElement("rss", new XAttribute("version", "2.0"), channel));
        return doc.Declaration + Environment.NewLine + doc;
    }

    public static string Atom(SiteConfig site, Manifest manifest)
    {
        var baseUri = site.Url.TrimEnd('/');
        var feed = new XElement(AtomNs + "feed",
            new XElement(AtomNs + "title", site.Title),
            new XElement(AtomNs + "subtitle", site.Description),
            new XElement(AtomNs + "id", baseUri + "/"),
            new XElement(AtomNs + "updated", DateTimeOffset.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")),
            new XElement(AtomNs + "link", new XAttribute("href", baseUri + "/")),
            new XElement(AtomNs + "link", new XAttribute("rel", "self"), new XAttribute("href", baseUri + "/atom.xml")),
            manifest.Posts.Take(site.FeedPostCount).Select(p => new XElement(AtomNs + "entry",
                new XElement(AtomNs + "title", p.Title),
                new XElement(AtomNs + "id", baseUri + p.Url),
                new XElement(AtomNs + "link", new XAttribute("href", baseUri + p.Url)),
                new XElement(AtomNs + "published", p.Published.ToString("yyyy-MM-ddTHH:mm:ssZ")),
                new XElement(AtomNs + "updated", (p.Modified ?? p.Published).ToString("yyyy-MM-ddTHH:mm:ssZ")),
                new XElement(AtomNs + "summary", p.Description))));
        var doc = new XDocument(new XDeclaration("1.0", "utf-8", null), feed);
        return doc.Declaration + Environment.NewLine + doc;
    }

    public static string Sitemap(SiteConfig site, Manifest manifest)
    {
        var baseUri = site.Url.TrimEnd('/');
        IEnumerable<XElement> Entry(string path, DateTimeOffset? lastmod = null) =>
        [
            new XElement(XNamespace.None + "url",
                new XElement(XNamespace.None + "loc", baseUri + path),
                lastmod is { } m ? new XElement(XNamespace.None + "lastmod", m.ToString("yyyy-MM-dd")) : null!)
        ];

        var urls = manifest.Posts.Select(p => Entry(p.Url, p.Modified ?? p.Published))
            .Append(Entry("/"))
            .Append(Entry("/posts/"))
            .Append(Entry("/archive/"))
            .Append(Entry("/tags/"))
            .Append(Entry("/categories/"))
            .Append(Entry("/about/"))
            .Append(Entry("/contact/"))
            .Concat(manifest.Tags.Where(t => t.Count > 0).Select(t => Entry($"/tags/{t.Slug}/")))
            .Concat(manifest.Categories.Where(c => c.Count > 0).Select(c => Entry($"/categories/{c.Slug}/")))
            .Concat(manifest.Authors.Select(a => Entry($"/authors/{a.Handle}/")))
            .SelectMany(x => x);

        var doc = new XDocument(new XDeclaration("1.0", "utf-8", null),
            new XElement(XNamespace.None + "urlset", new XAttribute(XNamespace.Xmlns + "x", "http://www.sitemaps.org/schemas/sitemap/0.9"), urls));
        return doc.Declaration + Environment.NewLine + doc;
    }
}

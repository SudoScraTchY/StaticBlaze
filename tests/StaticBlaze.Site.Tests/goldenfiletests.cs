using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using StaticBlaze.Core.Models;
using StaticBlaze.Site.Components;
using Xunit;

namespace StaticBlaze.Site.Tests;

/// <summary>
/// Golden-file tests for the Razor template layer. The generator renders these same components to
/// disk, so a change that silently alters the markup contract fails here instead of shipping.
///
/// Bootstrap: the first run for a missing fixture writes it and fails with a message. That is
/// deliberate — a baseline should never be created by a green run, because then it records whatever
/// the code happened to do rather than what was reviewed. Re-run to compare against it.
/// </summary>
public class GoldenFileTests
{
    // CallerFilePath must not be a parameter on a [Fact] (xUnit1001), so it is captured here.
    private static readonly string FixtureDir =
        Path.Combine(Path.GetDirectoryName(ThisFile())!, "fixtures");

    private static string ThisFile([CallerFilePath] string path = "") => path;

    private static async Task<string> RenderAsync<TComponent>(IDictionary<string, object?> parameters)
        where TComponent : IComponent
    {
        var services = new ServiceCollection();
        services.AddLogging();
        await using var provider = services.BuildServiceProvider();
        await using var renderer = new HtmlRenderer(provider, provider.GetRequiredService<ILoggerFactory>());
        return await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var root = renderer.BeginRenderingComponent<TComponent>(ParameterView.FromDictionary(parameters));
            await root.QuiescenceTask;
            return root.ToHtmlString();
        });
    }

    private static async Task AssertGoldenAsync(string fixtureName, string actual)
    {
        Directory.CreateDirectory(FixtureDir);
        var path = Path.Combine(FixtureDir, fixtureName);
        var normalised = actual.Replace("\r\n", "\n").TrimEnd() + "\n";

        if (!File.Exists(path))
        {
            await File.WriteAllTextAsync(path, normalised);
            Assert.Fail($"baseline created at {path} - review it, then re-run. A baseline is never accepted on a green run.");
        }

        var expected = (await File.ReadAllTextAsync(path)).Replace("\r\n", "\n").TrimEnd() + "\n";
        if (expected == normalised)
        {
            return;
        }

        var actualPath = path + ".actual";
        await File.WriteAllTextAsync(actualPath, normalised);
        Assert.Fail($"rendered markup differs from {fixtureName}. Actual output written to {actualPath}.");
    }

    private static PostSummary SamplePost() => new()
    {
        Slug = "hello-staticblaze",
        Url = "/posts/hello-staticblaze/",
        Title = "Hello, StaticBlaze",
        Description = "First light for a blog that is just a folder of markdown, a generator, and GitHub Pages.",
        AuthorHandle = "mehrshad",
        AuthorName = "Mehrshad",
        Tags = ["blazor", "static-sites"],
        Category = "meta",
        Published = new DateTimeOffset(2026, 8, 10, 10, 0, 0, TimeSpan.Zero),
        ReadTimeMinutes = 4,
        Featured = true,
    };

    private static SiteConfig SampleSite(string language = "en") => new()
    {
        Title = language == "fa" ? "مهرداد" : "mehrshad",
        Description = language == "fa" ? "یادداشت‌ها" : "Systems, software, and the things between them.",
        Url = "https://example.test/StaticBlaze",
        Language = language,
        Wordmark = language == "fa" ? "مهرداد" : "mehrshad",
        DefaultAuthor = "mehrshad",
        BasePath = "/StaticBlaze",
        Nav =
        [
            new NavLink { Label = language == "fa" ? "نوشته‌ها" : "posts", Href = "/" },
            new NavLink { Label = language == "fa" ? "برچسب‌ها" : "tags", Href = "/tags/" },
        ],
    };

    [Fact]
    public async Task PostCard_MatchesGoldenFile()
    {
        var html = await RenderAsync<PostCard>(new Dictionary<string, object?>
        {
            ["Post"] = SamplePost(),
            ["Base"] = "/StaticBlaze",
        });

        await AssertGoldenAsync("PostCard.html", html);
    }

    [Fact]
    public async Task PostCard_WithoutTagsOrFeatured_MatchesGoldenFile()
    {
        var post = SamplePost();
        post.Tags = [];
        post.Featured = false;

        var html = await RenderAsync<PostCard>(new Dictionary<string, object?>
        {
            ["Post"] = post,
            ["Base"] = "",
        });

        await AssertGoldenAsync("PostCard.no-tags.html", html);
    }

    [Fact]
    public async Task Pagination_MiddlePage_MatchesGoldenFile()
    {
        var html = await RenderAsync<Pagination>(new Dictionary<string, object?>
        {
            ["Page"] = 2,
            ["TotalPages"] = 3,
            ["BasePath"] = "/StaticBlaze/",
        });

        await AssertGoldenAsync("Pagination.page2of3.html", html);
    }

    [Fact]
    public async Task Pagination_SinglePage_RendersNothing()
    {
        var html = await RenderAsync<Pagination>(new Dictionary<string, object?>
        {
            ["Page"] = 1,
            ["TotalPages"] = 1,
            ["BasePath"] = "/StaticBlaze/",
        });

        Assert.True(string.IsNullOrWhiteSpace(html), "a single-page archive must not render pagination chrome");
    }

    [Fact]
    public async Task SitePage_Shell_MatchesGoldenFile()
    {
        var html = await RenderAsync<SitePage>(new Dictionary<string, object?>
        {
            ["Site"] = SampleSite(),
            ["Title"] = "Archive",
            ["Description"] = "Every post, newest first",
            ["Canonical"] = "/archive/",
        });

        await AssertGoldenAsync("SitePage.shell.html", html);
    }

    [Fact]
    public async Task SitePage_RtlLanguage_SwitchesDocumentDirection()
    {
        var html = await RenderAsync<SitePage>(new Dictionary<string, object?>
        {
            ["Site"] = SampleSite("fa"),
            ["Title"] = "بایگانی",
            ["Description"] = "همه نوشته‌ها",
            ["Canonical"] = "/archive/",
        });

        Assert.Contains("lang=\"fa\" dir=\"rtl\"", html);
    }

    [Fact]
    public async Task SitePage_LtrLanguage_KeepsDocumentDirection()
    {
        var html = await RenderAsync<SitePage>(new Dictionary<string, object?>
        {
            ["Site"] = SampleSite("en"),
            ["Title"] = "Archive",
            ["Description"] = "every post",
            ["Canonical"] = "/archive/",
        });

        Assert.Contains("lang=\"en\" dir=\"ltr\"", html);
    }

    [Fact]
    public async Task SitePage_Shell_KeepsTheParameterContract()
    {
        // Program.cs renders SitePage by name from a parameter dictionary; a renamed or removed
        // parameter would fail at generator run time, not compile time. Pin the surface here.
        var site = SampleSite();
        var html = await RenderAsync<SitePage>(new Dictionary<string, object?>
        {
            ["Site"] = site,
            ["Title"] = "T",
            ["Description"] = "D",
            ["Canonical"] = "/x/",
            ["OgType"] = "article",
            ["OgImage"] = "/assets/thumb.png",
            ["JsonLd"] = "{\"@type\":\"Thing\"}",
            ["ChildContent"] = (RenderFragment)(builder =>
            {
                builder.OpenElement(0, "p");
                builder.AddContent(1, "body");
                builder.CloseElement();
            }),
        });

        Assert.Contains("og:type\" content=\"article\"", html);
        Assert.Contains("og:image\" content=\"https://example.test/StaticBlaze/assets/thumb.png\"", html);
        Assert.Contains("{\"@type\":\"Thing\"}", html);
        Assert.Contains("<p>body</p>", html);
    }
}

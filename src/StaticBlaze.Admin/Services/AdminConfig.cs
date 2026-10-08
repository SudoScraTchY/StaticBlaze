namespace StaticBlaze.Admin.Services;

/// <summary>Repo wiring from wwwroot/appsettings.json - the single admin config source.</summary>
public sealed class AdminConfig
{
    public string Owner { get; set; } = "";
    public string Repo { get; set; } = "";
    public string Branch { get; set; } = "main";
    public string ContentPath { get; set; } = "content";

    /// <summary>
    /// Absolute origin of the published site, e.g. https://sudoscratchy.github.io.
    /// Markdown snippets reference assets against it, so copied links resolve on every
    /// page of the site (relative assets/ paths only work under some URL shapes).
    /// </summary>
    public string SiteUrl { get; set; } = "";

    public string RepoUrl => $"https://api.github.com/repos/{Owner}/{Repo}";
    public string Content(string relative) => $"{ContentPath}/{relative}".TrimStart('/');
}

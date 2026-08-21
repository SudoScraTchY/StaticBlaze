namespace StaticBlaze.Admin.Services;

/// <summary>Repo wiring from wwwroot/appsettings.json - the single admin config source.</summary>
public sealed class AdminConfig
{
    public string Owner { get; set; } = "";
    public string Repo { get; set; } = "";
    public string Branch { get; set; } = "main";
    public string ContentPath { get; set; } = "content";

    public string RepoUrl => $"https://api.github.com/repos/{Owner}/{Repo}";
    public string Content(string relative) => $"{ContentPath}/{relative}".TrimStart('/');
}

using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;

namespace StaticBlaze.Admin.Services;

public sealed record GitHubIdentity(string Login, string? Name, string? AvatarUrl);

/// <summary>
/// SHA-aware GitHub contents-API client. Creates PUT without a sha, updates PUT with the
/// current blob sha, and retries once on 409/422 by refetching the sha - the failure mode
/// that silently breaks every second taxonomy save in naive implementations.
/// </summary>
public sealed class GitHubApiClient(HttpClient http, AdminConfig cfg)
{
    private const string RawBase = "https://raw.githubusercontent.com";

    public void Attach(string token)
    {
        http.BaseAddress = new Uri("https://api.github.com/");
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        http.DefaultRequestHeaders.UserAgent.ParseAdd("StaticBlaze-Admin");
        http.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
        http.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
    }

    // ----- identity -----

    public async Task<GitHubIdentity> GetCurrentUserAsync()
    {
        var user = await http.GetFromJsonAsync<GitHubUser>("user") ?? throw new InvalidOperationException("bad token");
        return new GitHubIdentity(user.Login, user.Name, user.AvatarUrl);
    }

    /// <summary>Token must be able to see (and ideally push to) the configured repo.</summary>
    public async Task<bool> CanAccessRepoAsync() =>
        (await http.GetAsync($"{cfg.RepoUrl}")).IsSuccessStatusCode;

    // ----- files -----

    public async Task<GitHubContent?> GetFileAsync(string path)
    {
        var response = await http.GetAsync($"{cfg.RepoUrl}/contents/{cfg.Content(path)}?ref={cfg.Branch}");
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<GitHubContent>();
    }

    public async Task<List<GitHubListItem>> ListAsync(string dir)
    {
        var response = await http.GetAsync($"{cfg.RepoUrl}/contents/{cfg.Content(dir)}?ref={cfg.Branch}");
        if (!response.IsSuccessStatusCode) return [];
        return await response.Content.ReadFromJsonAsync<List<GitHubListItem>>() ?? [];
    }

    public async Task<string> PutFileAsync(string path, string content, string message, string? sha = null)
    {
        var body = new { message, content = Convert.ToBase64String(Encoding.UTF8.GetBytes(content)), branch = cfg.Branch, sha };
        var response = await http.PutAsJsonAsync($"{cfg.RepoUrl}/contents/{cfg.Content(path)}", body);

        if (!response.IsSuccessStatusCode && (int)response.StatusCode is 409 or 422 && sha is null)
        {
            // file already exists: refetch its sha and retry once
            var existing = await GetFileAsync(path);
            return await PutFileAsync(path, content, message, existing?.Sha);
        }

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<GitHubPutResult>();
        return result?.Content?.Path ?? cfg.Content(path);
    }

    public async Task PutBytesAsync(string path, byte[] bytes, string message)
    {
        var existing = await GetFileAsync(path);
        var body = new { message, content = Convert.ToBase64String(bytes), branch = cfg.Branch, sha = existing?.Sha };
        var response = await http.PutAsJsonAsync($"{cfg.RepoUrl}/contents/{cfg.Content(path)}", body);
        response.EnsureSuccessStatusCode();
    }

    public async Task DeleteFileAsync(string path, string message)
    {
        var existing = await GetFileAsync(path) ?? throw new InvalidOperationException($"{path} not found on GitHub");
        var body = new { message, sha = existing.Sha, branch = cfg.Branch };
        var response = await http.RequestAsync(HttpMethod.Delete, $"{cfg.RepoUrl}/contents/{cfg.Content(path)}", body);
        response.EnsureSuccessStatusCode();
    }

    public string RawUrl(string path) =>
        $"{RawBase}/{cfg.Owner}/{cfg.Repo}/{cfg.Branch}/{cfg.Content(path)}";

    public async Task<List<GitHubCommit>> GetRecentCommitsAsync(int count = 5) =>
        await http.GetFromJsonAsync<List<GitHubCommit>>($"{cfg.RepoUrl}/commits?per_page={count}") ?? [];

    // ----- DTOs -----

    private sealed record GitHubUser
    {
        [JsonPropertyName("login")] public string Login { get; init; } = "";
        [JsonPropertyName("name")] public string? Name { get; init; }
        [JsonPropertyName("avatar_url")] public string? AvatarUrl { get; init; }
    }
}

public sealed record GitHubContent
{
    [JsonPropertyName("name")] public string Name { get; init; } = "";
    [JsonPropertyName("path")] public string Path { get; init; } = "";
    [JsonPropertyName("sha")] public string Sha { get; init; } = "";
    [JsonPropertyName("content")] public string? Content { get; init; }
    [JsonPropertyName("download_url")] public string? DownloadUrl { get; init; }

    public string DecodedContent => Content is null
        ? ""
        : Encoding.UTF8.GetString(Convert.FromBase64String(Content.Replace("\n", "")));
}

public sealed record GitHubListItem
{
    [JsonPropertyName("name")] public string Name { get; init; } = "";
    [JsonPropertyName("path")] public string Path { get; init; } = "";
    [JsonPropertyName("type")] public string Type { get; init; } = "";
    [JsonPropertyName("sha")] public string Sha { get; init; } = "";
    [JsonPropertyName("download_url")] public string? DownloadUrl { get; init; }
    [JsonPropertyName("size")] public long Size { get; init; }
}

public sealed record GitHubPutResult
{
    [JsonPropertyName("content")] public GitHubContent? Content { get; init; }
}

public sealed record GitHubCommit
{
    [JsonPropertyName("sha")] public string Sha { get; init; } = "";
    [JsonPropertyName("commit")] public CommitDetail Commit { get; init; } = new();

    public sealed record CommitDetail
    {
        [JsonPropertyName("message")] public string Message { get; init; } = "";
        [JsonPropertyName("author")] public CommitAuthor Author { get; init; } = new();
    }

    public sealed record CommitAuthor
    {
        [JsonPropertyName("name")] public string Name { get; init; } = "";
        [JsonPropertyName("date")] public DateTimeOffset Date { get; init; }
    }
}

internal static class HttpRequestExtensions
{
    public static async Task<HttpResponseMessage> RequestAsync(this HttpClient client, HttpMethod method, string url, object? body)
    {
        using var request = new HttpRequestMessage(method, url);
        if (body is not null)
            request.Content = JsonContent.Create(body);
        return await client.SendAsync(request);
    }
}

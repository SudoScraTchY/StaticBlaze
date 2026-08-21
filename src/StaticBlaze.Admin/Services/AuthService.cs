namespace StaticBlaze.Admin.Services;

/// <summary>
/// Session state: PAT held in memory only, unlocked from the encrypted vault.
/// Auto-locks after 15 idle minutes; UI subscribes to OnChange to re-render on transitions.
/// </summary>
public sealed class AuthService : IDisposable
{
    public const int IdleLockMinutes = 15;

    private readonly PatVaultService _vault;
    private readonly GitHubApiClient _github;
    private readonly Timer _idleTimer;
    private string? _token;

    public AuthService(PatVaultService vault, GitHubApiClient github)
    {
        _vault = vault;
        _github = github;
        _idleTimer = new(async _ => await LockAsync(), null, Timeout.InfiniteTimeSpan, Timeout.InfiniteTimeSpan);
    }

    public GitHubIdentity? Identity { get; private set; }
    public bool Authed => _token is not null;
    public string Token => _token ?? throw new InvalidOperationException("vault is locked");

    public event Action? OnChange;

    private void Notify() => OnChange?.Invoke();

    public Task<bool> HasVaultAsync() => _vault.HasVaultAsync();

    /// <summary>First-run: verify the PAT against the configured repo, then store it encrypted under a passphrase.</summary>
    public async Task SetupAsync(string passphrase, string token)
    {
        _github.Attach(token);
        var identity = await _github.GetCurrentUserAsync();
        if (!await _github.CanAccessRepoAsync())
            throw new InvalidOperationException("Token cannot access the configured repository.");
        Identity = identity;
        _token = token;
        await _vault.CreateVaultAsync(passphrase, token);
        ArmIdleTimer();
        Notify();
    }

    public async Task UnlockAsync(string passphrase)
    {
        var token = await _vault.UnlockAsync(passphrase);
        _github.Attach(token);
        Identity = await _github.GetCurrentUserAsync();
        _token = token;
        ArmIdleTimer();
        Notify();
    }

    public async Task LockAsync()
    {
        _token = null;
        Identity = null;
        _idleTimer.Change(Timeout.InfiniteTimeSpan, Timeout.InfiniteTimeSpan);
        await _vault.LockAsync();
        Notify();
    }

    public async Task DestroyVaultAsync()
    {
        _token = null;
        Identity = null;
        _idleTimer.Change(Timeout.InfiniteTimeSpan, Timeout.InfiniteTimeSpan);
        await _vault.DestroyVaultAsync();
        Notify();
    }

    private void ArmIdleTimer() =>
        _idleTimer.Change(TimeSpan.FromMinutes(IdleLockMinutes), TimeSpan.FromMinutes(IdleLockMinutes));

    public void Dispose() => _idleTimer.Dispose();
}

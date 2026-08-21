using Microsoft.JSInterop;

namespace StaticBlaze.Admin.Services;

/// <summary>
/// Thin wrapper over the WebCrypto vault in wwwroot/js/patVault.js.
/// AES-GCM-256 + PBKDF2-SHA256 (310k iterations); ciphertext in localStorage,
/// the derived key lives only in the JS module's memory and dies with the page.
/// </summary>
public sealed class PatVaultService(IJSRuntime js)
{
    private IJSObjectReference? _module;

    private async Task<IJSObjectReference> ModuleAsync()
    {
        _module ??= await js.InvokeAsync<IJSObjectReference>("import", "./js/patVault.js");
        return _module;
    }

    public async Task<bool> HasVaultAsync()
    {
        var m = await ModuleAsync();
        return await m.InvokeAsync<bool>("hasVault");
    }

    public async Task CreateVaultAsync(string passphrase, string token)
    {
        var m = await ModuleAsync();
        await m.InvokeVoidAsync("createVault", passphrase, token);
    }

    /// <summary>Returns the PAT, or throws on wrong passphrase / corrupt vault.</summary>
    public async Task<string> UnlockAsync(string passphrase)
    {
        var m = await ModuleAsync();
        return await m.InvokeAsync<string>("unlock", passphrase);
    }

    public async Task LockAsync()
    {
        var m = await ModuleAsync();
        await m.InvokeVoidAsync("lock");
    }

    public async Task DestroyVaultAsync()
    {
        var m = await ModuleAsync();
        await m.InvokeVoidAsync("destroyVault");
    }
}

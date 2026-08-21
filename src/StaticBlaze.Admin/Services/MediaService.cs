using System.Security.Cryptography;
using HeyRed.Mime;
using SkiaSharp;

namespace StaticBlaze.Admin.Services;

/// <summary>
/// Media uploads with SHA-256 content-addressed names: identical bytes always map to the
/// same file, giving free dedup and immutable, cache-friendly URLs. Images are downscaled
/// and re-encoded in the browser via SkiaSharp before hashing; if the native wasm module
/// is unavailable or decoding fails, the original bytes upload unchanged.
/// </summary>
public sealed class MediaService(GitHubApiClient github)
{
    private const int MaxDimension = 1920;
    private const int JpegQuality = 80;

    public async Task<List<GitHubListItem>> ListAssetsAsync() =>
        (await github.ListAsync("assets")).OrderBy(a => a.Name).ToList();

    public async Task<string> UploadAsync(byte[] bytes, string contentType)
    {
        bytes = TryOptimize(bytes, contentType) ?? bytes;
        var hash = Convert.ToHexStringLower(SHA256.HashData(bytes));
        var extension = MimeTypesMap.GetExtension(contentType) is { } ext && ext.StartsWith('.') ? ext.TrimStart('.') : "bin";
        var name = $"{hash}.{extension}";
        await github.PutBytesAsync($"assets/{name}", bytes, $"upload media {name}");
        return github.RawUrl($"assets/{name}");
    }

    /// <summary>Markdown snippet referencing the raw URL (or relative path after publish).</summary>
    public static string MarkdownFor(string fileName) =>
        $"![{Path.GetFileNameWithoutExtension(fileName)}](assets/{fileName})";

    internal static byte[]? TryOptimize(byte[] bytes, string contentType)
    {
        if (bytes.Length < 64 * 1024) return null; // small enough already
        try
        {
            using var bitmap = SKBitmap.Decode(bytes);
            if (bitmap is null) return null;

            var isPng = contentType.Contains("png", StringComparison.OrdinalIgnoreCase);
            var hasAlpha = bitmap.AlphaType != SKAlphaType.Opaque;
            var keepPng = isPng && hasAlpha;

            var scale = Math.Min(1f, (float)MaxDimension / Math.Max(bitmap.Width, bitmap.Height));
            if (scale >= 1f && !keepPng && contentType.Contains("jpeg", StringComparison.OrdinalIgnoreCase))
                return null; // already jpeg, already small enough: do not recompress

            var width = Math.Max(1, (int)Math.Round(bitmap.Width * scale));
            var height = Math.Max(1, (int)Math.Round(bitmap.Height * scale));
            using var surface = SKSurface.Create(new SKImageInfo(width, height, SKColorType.Rgba8888, SKAlphaType.Premul));
            using var source = SKImage.FromBitmap(bitmap);
            surface.Canvas.DrawImage(source, new SKRect(0, 0, width, height),
                new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Linear));
            using var image = surface.Snapshot();
            using var data = keepPng
                ? image.Encode(SKEncodedImageFormat.Png, 100)
                : image.Encode(SKEncodedImageFormat.Jpeg, JpegQuality);
            return data.ToArray();
        }
        catch
        {
            return null; // native wasm missing or format unsupported: upload the original
        }
    }
}

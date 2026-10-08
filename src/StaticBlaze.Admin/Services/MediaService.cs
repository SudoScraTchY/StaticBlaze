using System.Security.Cryptography;
using HeyRed.Mime;
using SkiaSharp;

namespace StaticBlaze.Admin.Services;

/// <summary>
/// Media uploads with content-addressed names: a 16-character prefix of the SHA-256 of the
/// final bytes. Identical bytes always map to the same file (free dedup, immutable URLs) while
/// keeping filenames short enough to stay readable in markdown. Images are downscaled and
/// gently re-encoded in the browser via SkiaSharp before hashing - quality is preserved first,
/// size wins only when it is free; if the native wasm module is unavailable or decoding fails,
/// the original bytes upload unchanged.
/// </summary>
public sealed class MediaService(GitHubApiClient github)
{
    private const int MaxDimension = 1920;
    private const int JpegQuality = 85;
    private const int HashPrefixLength = 16;

    public async Task<List<GitHubListItem>> ListAssetsAsync() =>
        (await github.ListAsync("assets")).OrderBy(a => a.Name).ToList();

    public async Task<string> UploadAsync(byte[] bytes, string contentType)
    {
        bytes = TryOptimize(bytes, contentType) ?? bytes;
        var hash = Convert.ToHexStringLower(SHA256.HashData(bytes))[..HashPrefixLength];
        var name = $"{hash}.{ExtensionFor(bytes, contentType)}";
        await github.PutBytesAsync($"assets/{name}", bytes, $"upload media {name}");
        return github.RawUrl($"assets/{name}");
    }

    /// <summary>
    /// Extension from the declared content type, verified against the bytes themselves.
    /// MimeTypesMap has no entry for image/webp (and friends), which used to land every
    /// webp upload as .bin; when the declared type is unknown we sniff the magic number
    /// before ever falling back to bin.
    /// </summary>
    internal static string ExtensionFor(byte[] bytes, string contentType)
    {
        var declared = MimeTypesMap.GetExtension(contentType)?.TrimStart('.');
        if (!string.IsNullOrEmpty(declared) && declared != "bin") return declared;

        // declared type unknown (or unmapped): sniff the leading magic bytes
        if (HasPrefix(bytes, 0x89, 0x50, 0x4E, 0x47)) return "png";      // .PNG
        if (HasPrefix(bytes, 0xFF, 0xD8, 0xFF)) return "jpg";            // .JFIF
        if (HasPrefix(bytes, 0x47, 0x49, 0x46, 0x38)) return "gif";      // GIF8
        if (bytes.Length > 12 && HasPrefix(bytes, 0x52, 0x49, 0x46, 0x46) && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50) return "webp"; // RIFF....WEBP
        if (HasPrefix(bytes, 0x3C, 0x73, 0x76, 0x67)) return "svg";      // <svg
        if (HasPrefix(bytes, 0x42, 0x4D)) return "bmp";                  // BM
        if (HasPrefix(bytes, 0x00, 0x00, 0x01, 0x00)) return "ico";      // .ico
        return "bin";
    }

    private static bool HasPrefix(byte[] bytes, params byte[] prefix)
    {
        if (bytes.Length < prefix.Length) return false;
        for (var i = 0; i < prefix.Length; i++)
            if (bytes[i] != prefix[i]) return false;
        return true;
    }

    /// <summary>Markdown snippet referencing the asset on the published site (absolute URL,
    /// so the snippet resolves from any page and in any renderer).</summary>
    public static string MarkdownFor(string fileName, string siteUrl)
    {
        var origin = string.IsNullOrWhiteSpace(siteUrl) ? "" : siteUrl.TrimEnd('/');
        return $"![{Path.GetFileNameWithoutExtension(fileName)}]({origin}/assets/{fileName})";
    }

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
            // quality first: an already-compact format that needs no downscale is never recompressed
            var isJpeg = contentType.Contains("jpeg", StringComparison.OrdinalIgnoreCase);
            var isWebp = contentType.Contains("webp", StringComparison.OrdinalIgnoreCase);
            if (scale >= 1f && (isJpeg || (isWebp && !hasAlpha)))
                return null; // within the size cap and already compact: upload the original bytes

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

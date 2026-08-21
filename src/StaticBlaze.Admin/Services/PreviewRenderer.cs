using StaticBlaze.Core.Markdown;

namespace StaticBlaze.Admin.Services;

/// <summary>
/// Admin preview goes through the SAME pipeline the generator uses, so what the author
/// sees while editing is byte-for-byte what visitors get after publish.
/// </summary>
public sealed class PreviewRenderer
{
    public string Render(string markdown) => MarkdownPipelineFactory.ToHtml(markdown);
}

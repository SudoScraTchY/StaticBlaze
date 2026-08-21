using Markdig;
using Markdig.Extensions.AutoIdentifiers;

namespace StaticBlaze.Core.Markdown;

/// <summary>
/// The single Markdig pipeline for the whole system. The generator (final site HTML)
/// and the admin live preview must both render through this factory so that
/// "preview is what ships" holds. Never construct a pipeline elsewhere.
/// </summary>
public static class MarkdownPipelineFactory
{
    public static MarkdownPipeline Pipeline { get; } = new MarkdownPipelineBuilder()
        .UseYamlFrontMatter()
        .UsePipeTables()
        .UseGridTables()
        .UseEmojiAndSmiley()
        .UseAutoIdentifiers(AutoIdentifierOptions.GitHub)
        .UseGenericAttributes()
        .UseAdvancedExtensions()
        .UseTaskLists()
        .UseCitations()
        .UseFootnotes()
        .UseFooters()
        .UseAutoLinks()
        .Build();

    public static string ToHtml(string markdown) => Markdig.Markdown.ToHtml(MermaidPreprocessor.Transform(markdown), Pipeline);

    public static string ToPlainText(string markdown) => Markdig.Markdown.ToPlainText(markdown, Pipeline);
}

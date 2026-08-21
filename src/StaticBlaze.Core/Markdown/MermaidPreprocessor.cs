using System.Text.RegularExpressions;

namespace StaticBlaze.Core.Markdown;

public static partial class MermaidPreprocessor
{
    // Fence names understood by mermaid v11; graph/sequenceDiagram etc. are accepted as legacy fence aliases.
    [GeneratedRegex(
        @"^[ \t]*```[ \t]*(mermaid|graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|sankey-beta|xychart-beta|block-beta|packet-beta|architecture-beta|requirementDiagram|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)([ \t]+[^\r\n]*)?[ \t]*\r?\n(?<body>.*?)\r?\n[ \t]*```",
        RegexOptions.Singleline | RegexOptions.Multiline | RegexOptions.Compiled)]
    private static partial Regex MermaidFence();

    /// <summary>Rewrites mermaid fenced blocks into plain <c>pre.mermaid</c> elements so the
    /// diagram source survives Markdig untouched and mermaid.js can render it client-side.</summary>
    public static string Transform(string markdown) =>
        MermaidFence().Replace(markdown,
            m => $"<pre class=\"mermaid\">\n{m.Groups["body"].Value.TrimEnd()}\n</pre>");
}

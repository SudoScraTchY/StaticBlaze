using StaticBlaze.Core.Markdown;
using Xunit;

namespace StaticBlaze.Core.Tests;

public class MermaidTests
{
    [Theory]
    [InlineData("mermaid")]
    [InlineData("graph TD")]
    [InlineData("sequenceDiagram")]
    [InlineData("gantt")]
    [InlineData("classDiagram")]
    public void Transform_MermaidFences_BecomePreMermaid(string fence)
    {
        var md = $"""
            text before

            ```{fence}
            A --> B
            ```

            text after
            """;
        var html = MarkdownPipelineFactory.ToHtml(md);
        Assert.Contains("<pre class=\"mermaid\">", html);
        // raw HTML blocks pass through Markdig unescaped
        Assert.Contains("A --> B", html);
        Assert.DoesNotContain("language-mermaid", html);
    }

    [Fact]
    public void Transform_RegularCodeBlocks_Untouched()
    {
        var html = MarkdownPipelineFactory.ToHtml("```csharp\nvar x = 1;\n```");
        Assert.Contains("language-csharp", html);
        Assert.DoesNotContain("mermaid", html);
    }

    [Fact]
    public void ToHtml_AdvancedMarkdown_Renders()
    {
        var html = MarkdownPipelineFactory.ToHtml(
            "| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n\n:smile:");
        Assert.Contains("<table>", html);
        Assert.Contains("checkbox", html);
        Assert.Contains("😄", html);
    }
}

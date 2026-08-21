using System.Text.RegularExpressions;
using StaticBlaze.Core.Models;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace StaticBlaze.Core.Frontmatter;

public static partial class FrontmatterSerializer
{
    [GeneratedRegex(@"\A---[ \t]*\r?\n(?<meta>.*?)\r?\n---[ \t]*\r?\n?", RegexOptions.Singleline)]
    private static partial Regex FrontmatterRegex();

    private static IDeserializer Deserializer { get; } = new DeserializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .WithTypeConverter(new DateTimeOffsetYamlConverter())
        .IgnoreUnmatchedProperties()
        .Build();

    private static ISerializer Serializer { get; } = new SerializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .WithTypeConverter(new DateTimeOffsetYamlConverter())
        .ConfigureDefaultValuesHandling(DefaultValuesHandling.OmitDefaults)
        .Build();

    /// <summary>Parses a post file into frontmatter + body markdown. Throws <see cref="FrontmatterException"/> when malformed.</summary>
    public static (PostFrontmatter Frontmatter, string Body) Parse(string markdown, string sourceName)
    {
        var match = FrontmatterRegex().Match(markdown);
        if (!match.Success)
            throw new FrontmatterException(sourceName, "missing YAML frontmatter block (must start with '---')");

        PostFrontmatter fm;
        try
        {
            fm = Deserializer.Deserialize<PostFrontmatter>(match.Groups["meta"].Value)
                 ?? throw new FrontmatterException(sourceName, "frontmatter block is empty");
        }
        catch (FrontmatterException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new FrontmatterException(sourceName, $"invalid YAML: {ex.Message}");
        }

        var body = markdown[match.Length..];
        return (fm, body.TrimStart('\r', '\n'));
    }

    public static string Serialize(PostFrontmatter frontmatter, string body) =>
        $"---\n{Serializer.Serialize(frontmatter).TrimEnd('\n')}\n---\n\n{body.TrimStart('\r', '\n')}";
}

public sealed class FrontmatterException(string source, string problem) : Exception($"[{source}] {problem}")
{
    public string Source_ { get; } = source;
}

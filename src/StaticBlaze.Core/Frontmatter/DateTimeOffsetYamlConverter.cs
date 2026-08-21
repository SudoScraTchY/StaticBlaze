using System.Globalization;
using YamlDotNet.Core;
using YamlDotNet.Core.Events;
using YamlDotNet.Serialization;

namespace StaticBlaze.Core.Frontmatter;

/// <summary>
/// YamlDotNet has no built-in scalar handling for DateTimeOffset (it would serialize the
/// whole property graph of the struct). This forces ISO-8601 round-trip strings, e.g.
/// "2026-08-21T10:00:00.0000000+00:00", for both DateTimeOffset and DateTimeOffset?.
/// </summary>
public sealed class DateTimeOffsetYamlConverter : IYamlTypeConverter
{
    public bool Accepts(Type type) =>
        type == typeof(DateTimeOffset) || type == typeof(DateTimeOffset?);

    public object? ReadYaml(IParser parser, Type type, ObjectDeserializer rootDeserializer)
    {
        var value = parser.Consume<Scalar>().Value;
        if (string.IsNullOrWhiteSpace(value))
            return type == typeof(DateTimeOffset?) ? null : default(DateTimeOffset);
        return DateTimeOffset.Parse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
    }

    public void WriteYaml(IEmitter emitter, object? value, Type type, ObjectSerializer serializer)
    {
        var iso = value is DateTimeOffset dto
            ? dto.ToString("O", CultureInfo.InvariantCulture)
            : "";
        emitter.Emit(new Scalar(AnchorName.Empty, TagName.Empty, iso, ScalarStyle.Any, true, false));
    }
}

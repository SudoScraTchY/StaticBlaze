namespace StaticBlaze.Core.Markdown;

public static class ReadTime
{
    private const int WordsPerMinute = 200;

    public static (int Words, int Minutes) Estimate(string markdown)
    {
        var words = markdown.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length;
        return (words, Math.Max(1, (int)Math.Ceiling(words / (double)WordsPerMinute)));
    }
}

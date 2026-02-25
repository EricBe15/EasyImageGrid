using System.Text.RegularExpressions;

namespace EasyImageGridSidecar;

/// <summary>
/// Text wrapping for titles and filenames. Direct port of Python wrap_title/wrap_filename.
/// </summary>
public static partial class TextWrapper
{
    /// <summary>
    /// Word-wrap a title string on spaces, underscores, and slashes.
    /// </summary>
    public static List<string> WrapTitle(string title, double maxWidth, Func<string, double> measureFn)
    {
        var segments = SplitKeepingDelimiters(title);

        var lines = new List<string>();
        string currentLine = "";
        double currentW = 0.0;

        foreach (var seg in segments)
        {
            double segWidth = measureFn(seg);
            if (currentW + segWidth <= maxWidth || currentLine.Length == 0)
            {
                currentLine += seg;
                currentW += segWidth;
            }
            else
            {
                lines.Add(currentLine.TrimEnd());
                currentLine = seg;
                currentW = segWidth;
            }
        }

        if (currentLine.Length > 0)
            lines.Add(currentLine.TrimEnd());

        return lines;
    }

    /// <summary>
    /// Split on space, underscore, slash — keeping the delimiter at the end of each segment.
    /// Equivalent to Python: re.split(r'(?<=[_ /])', title)
    /// </summary>
    private static string[] SplitKeepingDelimiters(string text)
    {
        // Match: any sequence of non-delimiter chars followed by a delimiter (if present)
        var matches = SegmentRegex().Matches(text);
        var result = new string[matches.Count];
        for (int i = 0; i < matches.Count; i++)
            result[i] = matches[i].Value;
        return result;
    }

    /// <summary>
    /// Word-wrap a filename on underscores.
    /// </summary>
    public static List<string> WrapFilename(string filename, double maxWidth,
        Func<string, double> measureFn, double underscoreW)
    {
        var words = filename.Split('_');
        var lines = new List<string>();
        var currentParts = new List<string>();
        double currentW = 0.0;

        foreach (var word in words)
        {
            double wordWidth = measureFn(word);
            if (currentW + wordWidth <= maxWidth)
            {
                currentParts.Add(word);
                currentW += wordWidth + underscoreW;
            }
            else
            {
                if (currentParts.Count > 0)
                    lines.Add(string.Join("_", currentParts));
                currentParts = [word];
                currentW = wordWidth;
            }
        }

        if (currentParts.Count > 0)
            lines.Add(string.Join("_", currentParts));

        return lines;
    }

    // Matches segments: runs of non-delimiters optionally followed by a delimiter
    [GeneratedRegex(@"[^_ /]*[_ /]|[^_ /]+")]
    private static partial Regex SegmentRegex();
}

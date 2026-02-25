using System.Globalization;

namespace EasyImageGridSidecar;

/// <summary>
/// Parsed CLI arguments. Hand-rolled state-machine parser (AOT-safe, no reflection).
/// </summary>
public sealed record CliArgs
{
    public string InputDir { get; init; } = "";
    public string? Output { get; init; }
    public int Cols { get; init; } = 2;
    public int Rows { get; init; } = 3;
    public bool Landscape { get; init; }
    public int Quality { get; init; } = 100;
    public string? Title { get; init; }
    public bool NoTitle { get; init; }
    public bool NoPageNumbers { get; init; }
    public bool Recursive { get; init; }
    public bool SectionsFromStdin { get; init; }
    public bool FilesFromStdin { get; init; }
    public bool PerFolder { get; init; }
    public double Border { get; init; } = 15.0;
    public double HeaderSpace { get; init; } = 40.0;
    public double FilenameFontSize { get; init; } = 8.0;
    public double TitleFontSize { get; init; } = 14.0;
    public int JpegCompression { get; init; } = 92;
    public bool Benchmark { get; init; }

    private static string NextArg(string[] argv, ref int i, string flag)
    {
        if (i + 1 >= argv.Length)
        {
            JsonProtocol.EmitErr($"{flag} requires a value");
            Environment.Exit(1);
        }
        return argv[++i];
    }

    private static int ParseInt(string value, string flag, int min, int max)
    {
        if (!int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out int result)
            || result < min || result > max)
        {
            JsonProtocol.EmitErr($"{flag} must be an integer between {min} and {max}");
            Environment.Exit(1);
        }
        return result;
    }

    private static double ParseDouble(string value, string flag, double min, double max)
    {
        if (!double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out double result)
            || result < min || result > max)
        {
            JsonProtocol.EmitErr($"{flag} must be a number between {min} and {max}");
            Environment.Exit(1);
        }
        return result;
    }

    public static CliArgs Parse(string[] argv)
    {
        string inputDir = "";
        string? output = null;
        int cols = 2, rows = 3, quality = 100;
        bool landscape = false, noTitle = false, noPageNumbers = false;
        bool recursive = false, sectionsFromStdin = false, filesFromStdin = false, perFolder = false;
        bool benchmark = false;
        int jpegCompression = 92;
        double border = 15.0, headerSpace = 40.0;
        double filenameFontSize = 8.0, titleFontSize = 14.0;
        string? title = null;

        for (int i = 0; i < argv.Length; i++)
        {
            switch (argv[i])
            {
                case "--input-dir":
                    inputDir = NextArg(argv, ref i, "--input-dir");
                    break;
                case "--output":
                    output = NextArg(argv, ref i, "--output");
                    break;
                case "--cols":
                    cols = ParseInt(NextArg(argv, ref i, "--cols"), "--cols", 1, 6);
                    break;
                case "--rows":
                    rows = ParseInt(NextArg(argv, ref i, "--rows"), "--rows", 1, 6);
                    break;
                case "--landscape":
                    landscape = true;
                    break;
                case "--quality":
                    quality = ParseInt(NextArg(argv, ref i, "--quality"), "--quality", 50, 400);
                    break;
                case "--title":
                    title = NextArg(argv, ref i, "--title");
                    break;
                case "--no-title":
                    noTitle = true;
                    break;
                case "--no-page-numbers":
                    noPageNumbers = true;
                    break;
                case "--recursive":
                    recursive = true;
                    break;
                case "--sections-from-stdin":
                    sectionsFromStdin = true;
                    break;
                case "--files-from-stdin":
                    filesFromStdin = true;
                    break;
                case "--per-folder":
                    perFolder = true;
                    break;
                case "--border":
                    border = ParseDouble(NextArg(argv, ref i, "--border"), "--border", 5, 30);
                    break;
                case "--header-space":
                    headerSpace = ParseDouble(NextArg(argv, ref i, "--header-space"), "--header-space", 20, 60);
                    break;
                case "--filename-font-size":
                    filenameFontSize = ParseDouble(NextArg(argv, ref i, "--filename-font-size"), "--filename-font-size", 6, 14);
                    break;
                case "--title-font-size":
                    titleFontSize = ParseDouble(NextArg(argv, ref i, "--title-font-size"), "--title-font-size", 8, 24);
                    break;
                case "--jpeg-compression":
                    jpegCompression = ParseInt(NextArg(argv, ref i, "--jpeg-compression"), "--jpeg-compression", 1, 100);
                    break;
                case "--benchmark":
                    benchmark = true;
                    break;
                default:
                    JsonProtocol.EmitErr($"Unknown argument: {argv[i]}");
                    Environment.Exit(1);
                    break;
            }
        }

        if (string.IsNullOrEmpty(inputDir))
        {
            JsonProtocol.EmitErr("--input-dir is required");
            Environment.Exit(1);
        }

        return new CliArgs
        {
            InputDir = inputDir,
            Output = output,
            Cols = cols,
            Rows = rows,
            Landscape = landscape,
            Quality = quality,
            Title = title,
            NoTitle = noTitle,
            NoPageNumbers = noPageNumbers,
            Recursive = recursive,
            SectionsFromStdin = sectionsFromStdin,
            FilesFromStdin = filesFromStdin,
            PerFolder = perFolder,
            Border = border,
            HeaderSpace = headerSpace,
            FilenameFontSize = filenameFontSize,
            TitleFontSize = titleFontSize,
            JpegCompression = jpegCompression,
            Benchmark = benchmark,
        };
    }
}

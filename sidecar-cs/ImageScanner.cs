namespace EasyImageGridSidecar;

/// <summary>
/// Scans directories for compatible image files. Port of scan_images / scan_images_in_folder.
/// </summary>
public static class ImageScanner
{
    private static readonly HashSet<string> PdfCompatibleExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".tif", ".tiff", ".jpg", ".jpeg", ".png", ".webp"
    };

    private static readonly HashSet<string> RawExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".raw", ".cr2", ".cr3", ".nef", ".arw", ".dng",
        ".orf", ".rw2", ".raf", ".pef", ".srw"
    };

    private static readonly HashSet<string> AllExtensions;

    static ImageScanner()
    {
        AllExtensions = new HashSet<string>(PdfCompatibleExtensions, StringComparer.OrdinalIgnoreCase);
        foreach (var ext in RawExtensions)
            AllExtensions.Add(ext);
    }

    public static bool IsRaw(string path) =>
        RawExtensions.Contains(Path.GetExtension(path));

    public static bool IsSupported(string path) =>
        AllExtensions.Contains(Path.GetExtension(path));

    /// <summary>
    /// Scan directory for compatible image files, sorted by basename (case-insensitive).
    /// </summary>
    public static List<string> ScanImages(string inputDir, bool recursive = false)
    {
        var files = new List<string>();

        if (recursive)
        {
            ScanRecursive(inputDir, files);
        }
        else
        {
            ScanDirectory(inputDir, files);
        }

        files.Sort((a, b) => string.Compare(
            Path.GetFileName(a), Path.GetFileName(b), StringComparison.OrdinalIgnoreCase));
        return files;
    }

    /// <summary>
    /// Non-recursive scan of a single directory for image files (for sectioned mode).
    /// </summary>
    public static List<string> ScanImagesInFolder(string folderPath)
    {
        var files = new List<string>();
        ScanDirectory(folderPath, files);

        files.Sort((a, b) => string.Compare(
            Path.GetFileName(a), Path.GetFileName(b), StringComparison.OrdinalIgnoreCase));
        return files;
    }

    private static void ScanDirectory(string dir, List<string> files)
    {
        try
        {
            foreach (var f in Directory.GetFiles(dir))
            {
                var name = Path.GetFileName(f);
                if (!name.StartsWith('.') && AllExtensions.Contains(Path.GetExtension(f)))
                    files.Add(f);
            }
        }
        catch (UnauthorizedAccessException)
        {
            Console.Error.WriteLine($"Warning: Permission denied reading {dir}, skipping");
        }
        catch (DirectoryNotFoundException)
        {
            Console.Error.WriteLine($"Warning: Directory not found: {dir}, skipping");
        }
    }

    private static void ScanRecursive(string dir, List<string> files)
    {
        ScanDirectory(dir, files);

        try
        {
            foreach (var subDir in Directory.GetDirectories(dir))
            {
                if (Path.GetFileName(subDir).StartsWith('.'))
                    continue;
                ScanRecursive(subDir, files);
            }
        }
        catch (UnauthorizedAccessException)
        {
            Console.Error.WriteLine($"Warning: Permission denied listing subdirectories of {dir}, skipping");
        }
    }
}

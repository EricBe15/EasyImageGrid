using SkiaSharp;

namespace EasyImageGridSidecar;

/// <summary>
/// Platform-specific TrueType font loading. Port of _find_ttf_font / setup_fonts.
/// </summary>
public static class FontLoader
{
    public static (SKTypeface Regular, SKTypeface Bold) SetupFonts()
    {
        var pair = FindTtfFont();
        if (pair != null)
        {
            SKTypeface? regular = null;
            SKTypeface? bold = null;
            try
            {
                regular = SKTypeface.FromFile(pair.Value.Regular);
                bold = SKTypeface.FromFile(pair.Value.Bold);
                if (regular != null && bold != null)
                    return (regular, bold);
            }
            catch
            {
                // Fall through to default
            }
            regular?.Dispose();
            bold?.Dispose();
        }

        // Fallback to default typeface
        var defaultTf = SKTypeface.Default;
        return (defaultTf, defaultTf);
    }

    private static (string Regular, string Bold)? FindTtfFont()
    {
        (string Regular, string Bold)[] candidates =
        [
            // macOS
            ("/System/Library/Fonts/Supplemental/Arial.ttf",
             "/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
            // Windows
            ("C:/Windows/Fonts/arial.ttf",
             "C:/Windows/Fonts/arialbd.ttf"),
            // Linux (DejaVu)
            ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
             "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
            // Linux alt path
            ("/usr/share/fonts/TTF/DejaVuSans.ttf",
             "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf"),
        ];

        foreach (var (regular, bold) in candidates)
        {
            if (File.Exists(regular) && File.Exists(bold))
                return (regular, bold);
        }

        return null;
    }
}

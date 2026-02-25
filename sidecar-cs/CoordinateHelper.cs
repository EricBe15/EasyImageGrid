namespace EasyImageGridSidecar;

/// <summary>
/// Unit conversion and coordinate-system helpers.
/// Python reportlab uses bottom-left origin (Y up); SkiaSharp uses top-left (Y down).
/// All layout math stays in mm with bottom-left origin. Y-flip only at final draw calls.
/// </summary>
public static class CoordinateHelper
{
    public const double PtPerMm = 72.0 / 25.4;

    // A4 dimensions in mm
    public const double A4WidthMm = 210.0;
    public const double A4HeightMm = 297.0;

    public static float MmToPt(double mm) => (float)(mm * PtPerMm);

    /// <summary>
    /// Flip Y for an image rectangle. In reportlab, (x, y) is the bottom-left corner.
    /// In Skia, we need the top-left corner.
    /// </summary>
    public static float FlipYImage(double reportlabYMm, double imageHeightMm, double pageHeightMm)
    {
        // reportlabY is bottom of image from page bottom (in mm)
        // skiaY = pageHeight - reportlabY - imageHeight (all in pt)
        return MmToPt(pageHeightMm - reportlabYMm - imageHeightMm);
    }

    /// <summary>
    /// Flip Y for text baseline. In reportlab, y is the baseline from page bottom.
    /// In Skia, y is the baseline from page top.
    /// </summary>
    public static float FlipYText(double reportlabYMm, double pageHeightMm)
    {
        return MmToPt(pageHeightMm - reportlabYMm);
    }
}

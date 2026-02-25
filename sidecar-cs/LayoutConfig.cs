namespace EasyImageGridSidecar;

/// <summary>
/// Holds computed layout values and configurable spacing parameters.
/// Direct port of Python LayoutConfig dataclass.
/// </summary>
public sealed class LayoutConfig
{
    // Input parameters
    public int Cols { get; }
    public int Rows { get; }
    public bool Landscape { get; }
    public int Quality { get; }
    public int JpegCompression { get; }

    // Configurable spacing (mm unless noted)
    public double Border { get; }
    public double HeaderSpace { get; }
    public double HeaderYOffset { get; } = 15.0;
    public double FilenameOffset { get; } = 5.0;
    public double FilenameFontSize { get; }    // pt
    public double TitleFontSize { get; }       // pt
    public double PageNumberY { get; } = 8.0;

    // Computed fields
    public double Width { get; }       // mm
    public double Height { get; }      // mm
    public double ImgWidth { get; }    // mm
    public double ImgHeight { get; }   // mm
    public (double X, double Y)[] Positions { get; }
    public int ImagesPerPage { get; }
    public double ResolutionScale { get; }
    public double FilenameLineHeight { get; }  // mm

    public LayoutConfig(
        int cols, int rows, bool landscape, int quality,
        double border = 15.0, double headerSpace = 40.0,
        double filenameFontSize = 8.0, double titleFontSize = 14.0,
        int jpegCompression = 92)
    {
        Cols = cols;
        Rows = rows;
        Landscape = landscape;
        Quality = quality;
        JpegCompression = jpegCompression;
        Border = border;
        HeaderSpace = headerSpace;
        FilenameFontSize = filenameFontSize;
        TitleFontSize = titleFontSize;

        if (landscape)
        {
            Width = CoordinateHelper.A4HeightMm;   // 297
            Height = CoordinateHelper.A4WidthMm;   // 210
        }
        else
        {
            Width = CoordinateHelper.A4WidthMm;    // 210
            Height = CoordinateHelper.A4HeightMm;  // 297
        }

        ImgWidth = (Width - (cols + 1) * border) / cols;
        ImgHeight = (Height - headerSpace - (rows + 1) * border) / rows;

        if (ImgWidth < 5.0 || ImgHeight < 5.0)
            throw new ArgumentException(
                $"Grid parameters result in images too small to render ({ImgWidth:F1}x{ImgHeight:F1} mm). Reduce columns/rows or border size.");

        ImagesPerPage = cols * rows;
        // quality=100 → 1.5x (~108 DPI), quality=200 → 3.0x (~216 DPI)
        ResolutionScale = (quality / 100.0) * 1.5;

        // 1pt = 0.353mm, 1.3x multiplier for comfortable line spacing
        FilenameLineHeight = filenameFontSize * 0.353 * 1.3;

        // Pre-compute grid positions (in mm, bottom-left origin like reportlab)
        Positions = new (double, double)[ImagesPerPage];
        for (int row = 0; row < rows; row++)
        {
            for (int col = 0; col < cols; col++)
            {
                double x = border + col * (ImgWidth + border);
                double y = Height - (row + 1) * ImgHeight - (row + 1) * border - (headerSpace - 10);
                Positions[row * cols + col] = (x, y);
            }
        }
    }
}

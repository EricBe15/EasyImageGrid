using SkiaSharp;

namespace EasyImageGridSidecar;

/// <summary>
/// Image loading, dimension computation, and resizing.
/// Two decode paths ordered by speed:
///   1. SkiaSharp SKCodec (libjpeg-turbo/libpng) — JPEG/PNG/WebP with scaled JPEG decode
///   2. libtiff P/Invoke — TIFF including CMYK (same native C lib Pillow uses)
/// Two-step resize strategy (bilinear+mipmap bulk + Mitchell refinement) for
/// crisp thumbnails with minimal JPEG bloat, using only SkiaSharp.
/// </summary>
public static class ImageProcessor
{
    // Maximum pixel count to prevent decompression bombs
    // SkiaSharp path: 100M pixels (~400 MB) — up to 8 concurrent, uses scaled JPEG decode
    // LibTiff path: 250M pixels (~1 GB) — serialized via _tiffGate, no scaled decode available
    private const long MaxPixelBudget = 100_000_000;
    private const long MaxTiffPixelBudget = 250_000_000;

    // Serialize TIFF decodes: no scaled decode means full-res allocation every time
    private static readonly SemaphoreSlim _tiffGate = new(2, 2);

    // Bilinear + linear mipmaps for bulk downscale (smooth, alias-free)
    private static readonly SKSamplingOptions BoxSampling =
        new(SKFilterMode.Linear, SKMipmapMode.Linear);

    // Mitchell-Netravali cubic for final refinement (crisp edges, low ringing)
    private static readonly SKSamplingOptions MitchellSampling =
        new(SKCubicResampler.Mitchell);

    private static readonly HashSet<string> TiffExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".tif", ".tiff" };

    /// <summary>
    /// Pre-compute display dimensions and target pixel sizes for each image.
    /// </summary>
    public static (double dw, double dh, int tw, int th)[] ComputeDisplayDims(
        List<string> imageFiles, LayoutConfig layout)
    {
        var result = new (double dw, double dh, int tw, int th)[imageFiles.Count];
        double ptPerMm = CoordinateHelper.PtPerMm;

        Parallel.For(0, imageFiles.Count, i =>
        {
            var file = imageFiles[i];
            double imgRatio;

            if (ImageScanner.IsRaw(file))
            {
                Console.Error.WriteLine($"Warning: RAW file skipped for dimensions: {Path.GetFileName(file)}");
                imgRatio = 3.0 / 2.0;
            }
            else
            {
                try
                {
                    imgRatio = GetImageRatio(file);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Warning: Cannot read dimensions for {Path.GetFileName(file)}: {ex.Message}");
                    imgRatio = 3.0 / 2.0;
                }
            }

            double spaceRatio = layout.ImgWidth / layout.ImgHeight;
            double dw, dh;

            if (imgRatio > spaceRatio)
            {
                dw = layout.ImgWidth * ptPerMm;
                dh = dw / imgRatio;
            }
            else
            {
                dh = layout.ImgHeight * ptPerMm;
                dw = dh * imgRatio;
            }

            int tw = Math.Max(1, (int)(dw * layout.ResolutionScale));
            int th = Math.Max(1, (int)(dh * layout.ResolutionScale));
            result[i] = (dw, dh, tw, th);
        });

        return result;
    }

    /// <summary>
    /// Load, resize, and prepare an image as an SKBitmap ready for PDF drawing.
    /// </summary>
    public static SKBitmap PrepareImage(string imageFile, int targetW, int targetH)
    {
        if (ImageScanner.IsRaw(imageFile))
        {
            Console.Error.WriteLine($"Warning: RAW decode not supported, skipping: {Path.GetFileName(imageFile)}");
            return CreatePlaceholder(targetW, targetH);
        }

        // Path 1: SkiaSharp fast path (JPEG/PNG/WebP with scaled JPEG decode)
        var result = TrySkiaSharpFastPath(imageFile, targetW, targetH);
        if (result != null) return result;

        // Path 2: libtiff native decode for TIFF (including CMYK)
        if (TiffExtensions.Contains(Path.GetExtension(imageFile)))
        {
            result = TryLibTiffPath(imageFile, targetW, targetH);
            if (result != null) return result;
        }

        // All decode paths exhausted
        Console.Error.WriteLine($"Warning: Cannot decode {Path.GetFileName(imageFile)}");
        return CreatePlaceholder(targetW, targetH);
    }

    /// <summary>
    /// SkiaSharp fast path: scaled JPEG decode (libjpeg-turbo decodes at 1/2, 1/4, 1/8
    /// natively), then two-step resize via SkiaSharp.
    /// </summary>
    private static SKBitmap? TrySkiaSharpFastPath(string imageFile, int targetW, int targetH)
    {
        using var codec = SKCodec.Create(imageFile);
        if (codec == null) return null;

        int srcW = codec.Info.Width;
        int srcH = codec.Info.Height;

        // Want intermediate >= 2x target for quality
        float scaleW = (float)(targetW * 2) / srcW;
        float scaleH = (float)(targetH * 2) / srcH;
        float desiredScale = Math.Min(Math.Max(scaleW, scaleH), 1.0f);

        var scaledSize = codec.GetScaledDimensions(desiredScale);

        // Guard against decompression bombs
        if ((long)scaledSize.Width * scaledSize.Height > MaxPixelBudget)
        {
            Console.Error.WriteLine($"Warning: Image too large after scaling ({scaledSize.Width}x{scaledSize.Height}), skipping: {Path.GetFileName(imageFile)}");
            return null;
        }

        var decodeInfo = new SKImageInfo(scaledSize.Width, scaledSize.Height,
            SKColorType.Rgba8888, SKAlphaType.Unpremul);
        var decoded = new SKBitmap(decodeInfo);

        if (codec.GetPixels(decodeInfo, decoded.GetPixels()) != SKCodecResult.Success)
        {
            decoded.Dispose();
            return null;
        }

        if (decoded.Width == targetW && decoded.Height == targetH)
            return EnsureOpaque(decoded);

        var resized = TwoStepResize(decoded, targetW, targetH);
        decoded.Dispose();
        if (resized == null) return null;
        return EnsureOpaque(resized);
    }

    /// <summary>
    /// libtiff native decode path: handles ALL TIFF variants including CMYK.
    /// Decode at full res via C libtiff, then two-step resize via SkiaSharp.
    /// </summary>
    private static SKBitmap? TryLibTiffPath(string imageFile, int targetW, int targetH)
    {
        var dims = LibTiff.GetDimensions(imageFile);
        if (!dims.HasValue) return null;

        long pixelCount = (long)dims.Value.Width * dims.Value.Height;
        if (pixelCount > MaxTiffPixelBudget)
        {
            Console.Error.WriteLine($"Warning: TIFF too large ({dims.Value.Width}x{dims.Value.Height}, {pixelCount / 1_000_000}MP), skipping: {Path.GetFileName(imageFile)}");
            return null;
        }

        // Serialize TIFF decodes to avoid multiple full-res allocations in parallel
        _tiffGate.Wait();
        SKBitmap? fullBmp;
        try
        {
            fullBmp = LibTiff.DecodeToSKBitmap(imageFile, dims.Value.Width, dims.Value.Height);
        }
        finally
        {
            _tiffGate.Release();
        }

        if (fullBmp == null) return null;

        using (fullBmp)
        {
            if (fullBmp.Width == targetW && fullBmp.Height == targetH)
            {
                var copy = new SKBitmap(targetW, targetH, SKColorType.Rgba8888, SKAlphaType.Opaque);
                fullBmp.GetPixelSpan().CopyTo(copy.GetPixelSpan());
                return copy;
            }

            var resized = TwoStepResize(fullBmp, targetW, targetH);
            if (resized == null) return null;
            return EnsureOpaque(resized);
        }
    }

    /// <summary>
    /// Two-step resize using SkiaSharp:
    /// - Ratio > 4:1: bilinear+mipmap down to 2x target, then Mitchell to final
    /// - Ratio ≤ 4:1: single-step Mitchell
    /// </summary>
    private static SKBitmap? TwoStepResize(SKBitmap source, int targetW, int targetH)
    {
        float ratio = Math.Max((float)source.Width / targetW, (float)source.Height / targetH);

        if (ratio > 4)
        {
            // Step 1: bulk reduction to 2x target with bilinear+mipmap
            int midW = targetW * 2;
            int midH = targetH * 2;
            using var mid = source.Resize(new SKImageInfo(midW, midH), BoxSampling);
            if (mid == null)
                return source.Resize(new SKImageInfo(targetW, targetH), MitchellSampling);

            // Step 2: Mitchell for crisp final output
            return mid.Resize(new SKImageInfo(targetW, targetH), MitchellSampling);
        }

        return source.Resize(new SKImageInfo(targetW, targetH), MitchellSampling);
    }

    /// <summary>
    /// Ensure bitmap has opaque alpha. If any pixel has transparency,
    /// composite onto white background using SKCanvas.
    /// </summary>
    private static SKBitmap EnsureOpaque(SKBitmap bitmap)
    {
        if (bitmap.AlphaType == SKAlphaType.Opaque)
            return bitmap;

        // Check if there's actually any transparency
        var span = bitmap.GetPixelSpan();
        bool hasAlpha = false;
        for (int i = 3; i < span.Length; i += 4)
        {
            if (span[i] < 255) { hasAlpha = true; break; }
        }

        if (!hasAlpha)
        {
            // No actual transparency, just copy with opaque alpha type
            var opaque = new SKBitmap(bitmap.Width, bitmap.Height, SKColorType.Rgba8888, SKAlphaType.Opaque);
            bitmap.GetPixelSpan().CopyTo(opaque.GetPixelSpan());
            bitmap.Dispose();
            return opaque;
        }

        // Composite onto white background
        var result = new SKBitmap(bitmap.Width, bitmap.Height, SKColorType.Rgba8888, SKAlphaType.Opaque);
        using var canvas = new SKCanvas(result);
        canvas.Clear(SKColors.White);
        canvas.DrawBitmap(bitmap, 0, 0);
        bitmap.Dispose();
        return result;
    }

    public static double GetImageRatio(string file)
    {
        // For TIFF, try libtiff first (fast native header read, handles CMYK)
        if (TiffExtensions.Contains(Path.GetExtension(file)))
        {
            var dims = LibTiff.GetDimensions(file);
            if (dims.HasValue)
                return (double)dims.Value.Width / dims.Value.Height;
        }

        // SkiaSharp codec (header-only, fast for JPEG/PNG/WebP)
        using var codec = SKCodec.Create(file);
        if (codec != null)
            return (double)codec.Info.Width / codec.Info.Height;

        return 3.0 / 2.0;
    }

    private static SKBitmap CreatePlaceholder(int w, int h)
    {
        var bmp = new SKBitmap(w, h, SKColorType.Rgba8888, SKAlphaType.Opaque);
        using var canvas = new SKCanvas(bmp);
        canvas.Clear(SKColors.LightGray);
        return bmp;
    }
}

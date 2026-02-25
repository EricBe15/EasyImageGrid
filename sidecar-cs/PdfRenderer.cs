using SkiaSharp;

namespace EasyImageGridSidecar;

/// <summary>
/// PDF rendering using SKDocument.CreatePdf. Port of create_pdf, create_sectioned_pdf,
/// create_per_folder_pdfs, draw_page_header, draw_image_to_canvas, render_images_to_canvas.
/// </summary>
public static class PdfRenderer
{
    private static SKDocumentPdfMetadata BuildMetadata(int jpegCompression) => new()
    {
        EncodingQuality = jpegCompression,
    };

    /// <summary>
    /// Create a single PDF contact sheet from image files.
    /// </summary>
    public static (string OutputPath, int PageCount) CreatePdf(
        List<string> imageFiles,
        string folderName,
        string outputPath,
        LayoutConfig layout,
        bool pageNumbers = true,
        int progressOffset = 0,
        int progressTotal = 0,
        bool benchmark = false,
        CancellationToken ct = default)
    {
        var (regular, bold) = FontLoader.SetupFonts();

        var sw = System.Diagnostics.Stopwatch.StartNew();
        var displayDims = ImageProcessor.ComputeDisplayDims(imageFiles, layout);
        if (benchmark) JsonProtocol.EmitTiming("compute_dims", sw.Elapsed.TotalMilliseconds);

        int total = imageFiles.Count;
        int pageCount = (total + layout.ImagesPerPage - 1) / layout.ImagesPerPage;

        using var stream = File.Create(outputPath);
        using var document = SKDocument.CreatePdf(stream, BuildMetadata(layout.JpegCompression));

        float pageW = CoordinateHelper.MmToPt(layout.Width);
        float pageH = CoordinateHelper.MmToPt(layout.Height);

        // Measure underscore width for filename wrapping
        using var measureFont = new SKFont(regular, (float)layout.FilenameFontSize);
        double underscoreW = measureFont.MeasureText("_") / CoordinateHelper.PtPerMm;

        sw.Restart();
        RenderImagesToCanvas(
            document, imageFiles, displayDims, layout,
            regular, bold, underscoreW,
            title: folderName,
            pageNumbers: pageNumbers,
            totalPages: pageCount,
            pageOffset: 0,
            progressOffset: progressOffset,
            progressTotal: progressTotal,
            isFirstSection: true,
            pageW: pageW, pageH: pageH,
            ct: ct);
        if (benchmark) JsonProtocol.EmitTiming("render", sw.Elapsed.TotalMilliseconds);

        sw.Restart();
        document.Close();
        if (benchmark) JsonProtocol.EmitTiming("save", sw.Elapsed.TotalMilliseconds);

        return (outputPath, pageCount);
    }

    /// <summary>
    /// Create a PDF with per-folder sections, each starting on a new page.
    /// </summary>
    public static (string OutputPath, int PageCount) CreateSectionedPdf(
        List<SectionInput> sections,
        string outputPath,
        LayoutConfig layout,
        bool pageNumbers = true,
        bool benchmark = false,
        CancellationToken ct = default)
    {
        var (regular, bold) = FontLoader.SetupFonts();

        var sw = System.Diagnostics.Stopwatch.StartNew();
        var sectionData = new List<(string DisplayName, List<string> Files,
            (double dw, double dh, int tw, int th)[] Dims, int PageCount)>();
        int grandTotal = 0;
        int totalPages = 0;

        foreach (var sec in sections)
        {
            ct.ThrowIfCancellationRequested();
            var imageFiles = ImageScanner.ScanImagesInFolder(sec.FolderPath);
            if (imageFiles.Count == 0) continue;

            int secPages = (imageFiles.Count + layout.ImagesPerPage - 1) / layout.ImagesPerPage;
            var dims = ImageProcessor.ComputeDisplayDims(imageFiles, layout);
            totalPages += secPages;
            grandTotal += imageFiles.Count;
            sectionData.Add((sec.DisplayName, imageFiles, dims, secPages));
        }
        if (benchmark) JsonProtocol.EmitTiming("scan", sw.Elapsed.TotalMilliseconds);

        if (sectionData.Count == 0)
            throw new InvalidOperationException("No images found in any section folder.");

        using var stream = File.Create(outputPath);
        using var document = SKDocument.CreatePdf(stream, BuildMetadata(layout.JpegCompression));

        float pageW = CoordinateHelper.MmToPt(layout.Width);
        float pageH = CoordinateHelper.MmToPt(layout.Height);

        using var measureFont = new SKFont(regular, (float)layout.FilenameFontSize);
        double underscoreW = measureFont.MeasureText("_") / CoordinateHelper.PtPerMm;

        int globalIdx = 0;
        int currentPageOffset = 0;

        sw.Restart();
        for (int secIdx = 0; secIdx < sectionData.Count; secIdx++)
        {
            ct.ThrowIfCancellationRequested();
            var (displayName, files, dims, secPageCount) = sectionData[secIdx];

            RenderImagesToCanvas(
                document, files, dims, layout,
                regular, bold, underscoreW,
                title: displayName,
                pageNumbers: pageNumbers,
                totalPages: totalPages,
                pageOffset: currentPageOffset,
                progressOffset: globalIdx,
                progressTotal: grandTotal,
                isFirstSection: secIdx == 0,
                pageW: pageW, pageH: pageH,
                ct: ct);

            globalIdx += files.Count;
            currentPageOffset += secPageCount;
        }
        if (benchmark) JsonProtocol.EmitTiming("render", sw.Elapsed.TotalMilliseconds);

        sw.Restart();
        document.Close();
        if (benchmark) JsonProtocol.EmitTiming("save", sw.Elapsed.TotalMilliseconds);

        return (outputPath, totalPages);
    }

    /// <summary>
    /// Create one PDF per folder section.
    /// </summary>
    public static (List<string> OutputFiles, int TotalPages) CreatePerFolderPdfs(
        List<SectionInput> sections,
        string outputDir,
        LayoutConfig layout,
        bool pageNumbers = true,
        bool benchmark = false,
        CancellationToken ct = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        int grandTotal = 0;
        var sectionImages = new List<List<string>>();

        foreach (var sec in sections)
        {
            var images = ImageScanner.ScanImagesInFolder(sec.FolderPath);
            sectionImages.Add(images);
            grandTotal += images.Count;
        }
        if (benchmark) JsonProtocol.EmitTiming("scan", sw.Elapsed.TotalMilliseconds);

        string currentDate = DateTime.Now.ToString("yyyy-MM-dd");
        var outputFiles = new List<string>();
        int totalPages = 0;
        int globalIdx = 0;

        for (int i = 0; i < sections.Count; i++)
        {
            ct.ThrowIfCancellationRequested();
            var images = sectionImages[i];
            if (images.Count == 0) continue;

            string displayName = sections[i].DisplayName;
            string safeName = displayName.Replace("/", "_").Replace("\\", "_");
            string outPath = Path.Combine(outputDir, $"{safeName}_{currentDate}.pdf");

            var (resultPath, pages) = CreatePdf(
                imageFiles: images,
                folderName: displayName,
                outputPath: outPath,
                layout: layout,
                pageNumbers: pageNumbers,
                progressOffset: globalIdx,
                progressTotal: grandTotal,
                benchmark: benchmark,
                ct: ct);

            outputFiles.Add(resultPath);
            totalPages += pages;
            globalIdx += images.Count;
        }

        return (outputFiles, totalPages);
    }

    /// <summary>
    /// Core rendering engine: draw images onto PDF pages with parallel image prep.
    /// </summary>
    private static int RenderImagesToCanvas(
        SKDocument document,
        List<string> imageFiles,
        (double dw, double dh, int tw, int th)[] displayDims,
        LayoutConfig layout,
        SKTypeface regular,
        SKTypeface bold,
        double underscoreW,
        string title,
        bool pageNumbers,
        int totalPages,
        int pageOffset,
        int progressOffset,
        int progressTotal,
        bool isFirstSection,
        float pageW,
        float pageH,
        CancellationToken ct)
    {
        int total = imageFiles.Count;
        int effectiveTotal = progressTotal > 0 ? progressTotal : total;
        int secPages = (total + layout.ImagesPerPage - 1) / layout.ImagesPerPage;

        int prefetch = Math.Min(8, Environment.ProcessorCount);
        using var semaphore = new SemaphoreSlim(prefetch);

        // Launch parallel image preparation
        var tasks = new Task<SKBitmap>[total];
        for (int i = 0; i < total; i++)
        {
            ct.ThrowIfCancellationRequested();
            int idx = i;
            tasks[i] = Task.Run(async () =>
            {
                await semaphore.WaitAsync(ct);
                try
                {
                    return ImageProcessor.PrepareImage(
                        imageFiles[idx], displayDims[idx].tw, displayDims[idx].th);
                }
                finally
                {
                    semaphore.Release();
                }
            }, ct);
        }

        SKCanvas? canvas = null;

        for (int i = 0; i < total; i++)
        {
            ct.ThrowIfCancellationRequested();

            if (i % layout.ImagesPerPage == 0)
            {
                if (!(isFirstSection && i == 0))
                {
                    // End previous page
                    canvas?.Dispose();
                    document.EndPage();
                }
                // Begin new page
                canvas = document.BeginPage(pageW, pageH);
                int currentPage = pageOffset + i / layout.ImagesPerPage + 1;
                DrawPageHeader(canvas, title, layout, regular, bold, currentPage, totalPages, pageNumbers);
            }

            var pos = layout.Positions[i % layout.ImagesPerPage];
            SKBitmap bmp;
            try
            {
                bmp = tasks[i].GetAwaiter().GetResult();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Warning: Failed to process {Path.GetFileName(imageFiles[i])}: {ex.Message}");
                bmp = new SKBitmap(displayDims[i].tw, displayDims[i].th, SKColorType.Rgba8888, SKAlphaType.Opaque);
                using var c = new SKCanvas(bmp);
                c.Clear(SKColors.LightGray);
            }
            string filename = NormalizeNfc(Path.GetFileName(imageFiles[i]));

            DrawImageToCanvas(canvas!, bmp, filename, pos, displayDims[i], layout, regular, underscoreW);
            bmp.Dispose();

            int effectiveCurrent = progressOffset + i + 1;
            JsonProtocol.EmitProgress(effectiveCurrent, effectiveTotal, filename);
        }

        // End last page
        if (canvas != null)
        {
            canvas.Dispose();
            document.EndPage();
        }

        return secPages;
    }

    /// <summary>
    /// Draw title and page number on the current page.
    /// </summary>
    private static void DrawPageHeader(
        SKCanvas canvas,
        string title,
        LayoutConfig layout,
        SKTypeface regular,
        SKTypeface bold,
        int page,
        int totalPages,
        bool pageNumbers)
    {
        title = NormalizeNfc(title);

        if (!string.IsNullOrEmpty(title))
        {
            using var titleFont = new SKFont(bold, (float)layout.TitleFontSize);
            using var titlePaint = new SKPaint { IsAntialias = true, Color = SKColors.Black };

            double maxTitleWidth = layout.Width - 2 * layout.Border;

            double TitleMeasure(string text) =>
                titleFont.MeasureText(text) / CoordinateHelper.PtPerMm;

            var lines = TextWrapper.WrapTitle(title, maxTitleWidth, TitleMeasure);

            if (lines.Count > 0)
            {
            double titleLineHeight = layout.TitleFontSize * 0.353 * 1.3;
            double textBlockHeight = (lines.Count - 1) * titleLineHeight + layout.TitleFontSize * 0.353;
            double zoneTop = layout.Border;
            double zoneBottom = layout.HeaderSpace - 10;
            double zoneHeight = zoneBottom - zoneTop;
            double blockTop = zoneTop + (zoneHeight - textBlockHeight) / 2;
            double firstBaseline = layout.Height - blockTop - layout.TitleFontSize * 0.353;

            float centerX = CoordinateHelper.MmToPt(layout.Width / 2);

            for (int j = 0; j < lines.Count; j++)
            {
                double baselineMm = firstBaseline - j * titleLineHeight;
                float skiaY = CoordinateHelper.FlipYText(baselineMm, layout.Height);
                canvas.DrawText(lines[j], centerX, skiaY, SKTextAlign.Center, titleFont, titlePaint);
            }
            }
        }

        if (pageNumbers)
        {
            using var pageFont = new SKFont(regular, (float)layout.FilenameFontSize);
            using var pagePaint = new SKPaint { IsAntialias = true, Color = SKColors.Black };

            float centerX = CoordinateHelper.MmToPt(layout.Width / 2);
            float skiaY = CoordinateHelper.FlipYText(layout.PageNumberY, layout.Height);
            canvas.DrawText($"{page}/{totalPages}", centerX, skiaY, SKTextAlign.Center, pageFont, pagePaint);
        }
    }

    /// <summary>
    /// Draw a single image and its filename label onto the canvas.
    /// </summary>
    private static void DrawImageToCanvas(
        SKCanvas canvas,
        SKBitmap bmp,
        string filename,
        (double X, double Y) pos,
        (double dw, double dh, int tw, int th) dims,
        LayoutConfig layout,
        SKTypeface regular,
        double underscoreW)
    {
        double displayWidthMm = dims.dw / CoordinateHelper.PtPerMm;
        double displayHeightMm = dims.dh / CoordinateHelper.PtPerMm;

        double xOffset = (layout.ImgWidth - displayWidthMm) / 2;
        double yOffset = (layout.ImgHeight - displayHeightMm) / 2;

        double imgXMm = pos.X + xOffset;
        double imgYMm = pos.Y + yOffset;

        float skiaX = CoordinateHelper.MmToPt(imgXMm);
        float skiaY = CoordinateHelper.FlipYImage(imgYMm, displayHeightMm, layout.Height);
        float skiaW = (float)dims.dw;
        float skiaH = (float)dims.dh;

        canvas.DrawBitmap(bmp, SKRect.Create(skiaX, skiaY, skiaW, skiaH));

        // Filename wrapping
        using var fnFont = new SKFont(regular, (float)layout.FilenameFontSize);
        using var fnPaint = new SKPaint { IsAntialias = true, Color = SKColors.Black };

        double maxTextWidth = layout.ImgWidth - 4; // mm

        double FnMeasure(string text) =>
            fnFont.MeasureText(text) / CoordinateHelper.PtPerMm;

        var lines = TextWrapper.WrapFilename(filename, maxTextWidth, FnMeasure, underscoreW);

        double startY = pos.Y - layout.FilenameOffset;

        for (int j = 0; j < lines.Count; j++)
        {
            double textWidthMm = fnFont.MeasureText(lines[j]) / CoordinateHelper.PtPerMm;
            double textXMm = pos.X + (layout.ImgWidth - textWidthMm) / 2;
            double textYMm = startY - j * layout.FilenameLineHeight;

            float sx = CoordinateHelper.MmToPt(textXMm);
            float sy = CoordinateHelper.FlipYText(textYMm, layout.Height);
            canvas.DrawText(lines[j], sx, sy, SKTextAlign.Left, fnFont, fnPaint);
        }
    }

    private static string NormalizeNfc(string text)
    {
        if (string.IsNullOrEmpty(text)) return text;
        return text.IsNormalized(System.Text.NormalizationForm.FormC)
            ? text
            : text.Normalize(System.Text.NormalizationForm.FormC);
    }
}

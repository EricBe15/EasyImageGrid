namespace EasyImageGridSidecar;

public static class Program
{
    private static readonly CancellationTokenSource Cts = new();

    public static int Main(string[] argv)
    {
        // SIGTERM / Ctrl+C handling
        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            Cts.Cancel();
        };
        AppDomain.CurrentDomain.ProcessExit += (_, _) => Cts.Cancel();

        try
        {
            return Run(argv);
        }
        catch (OperationCanceledException)
        {
            return 130; // Standard SIGINT exit code
        }
        catch (Exception ex)
        {
            JsonProtocol.EmitErr(ex.Message);
            return 1;
        }
    }

    private static int Run(string[] argv)
    {
        var args = CliArgs.Parse(argv);
        bool benchmark = args.Benchmark;
        var totalSw = System.Diagnostics.Stopwatch.StartNew();

        // Validate input directory (not required for files-from-stdin mode
        // where it's only used as title/output fallback)
        if (!args.FilesFromStdin && !Directory.Exists(args.InputDir))
        {
            JsonProtocol.EmitErr($"Input directory does not exist: {args.InputDir}");
            return 1;
        }

        // Sectioned mode: read folder sections from stdin
        if (args.SectionsFromStdin)
        {
            List<SectionInput> sections;
            try
            {
                string stdinData = Console.In.ReadToEnd();
                sections = JsonProtocol.DeserializeSections(stdinData);
            }
            catch (Exception e)
            {
                JsonProtocol.EmitErr($"Failed to read sections from stdin: {e.Message}");
                return 1;
            }

            if (string.IsNullOrEmpty(args.Output))
            {
                JsonProtocol.EmitErr("--output is required with --sections-from-stdin");
                return 1;
            }

            var layout = BuildLayout(args);

            if (args.PerFolder)
            {
                var (outputFiles, totalPages) = PdfRenderer.CreatePerFolderPdfs(
                    sections, args.Output, layout,
                    pageNumbers: !args.NoPageNumbers,
                    benchmark: benchmark,
                    ct: Cts.Token);

                if (benchmark)
                    JsonProtocol.EmitTiming("total", totalSw.Elapsed.TotalMilliseconds);
                JsonProtocol.EmitDoneMulti(args.Output, totalPages, outputFiles);
            }
            else
            {
                var (resultPath, pageCount) = PdfRenderer.CreateSectionedPdf(
                    sections, args.Output, layout,
                    pageNumbers: !args.NoPageNumbers,
                    benchmark: benchmark,
                    ct: Cts.Token);

                if (benchmark)
                    JsonProtocol.EmitTiming("total", totalSw.Elapsed.TotalMilliseconds);
                JsonProtocol.EmitDone(resultPath, pageCount);
            }

            return 0;
        }

        // Files-from-stdin mode: explicit file list passed via stdin
        if (args.FilesFromStdin)
        {
            List<string> fileList;
            try
            {
                string stdinData = Console.In.ReadToEnd();
                fileList = JsonProtocol.DeserializeFileList(stdinData);
            }
            catch (Exception e)
            {
                JsonProtocol.EmitErr($"Failed to read file list from stdin: {e.Message}");
                return 1;
            }

            // Filter to supported extensions only
            fileList = fileList.Where(ImageScanner.IsSupported).ToList();

            if (fileList.Count == 0)
            {
                JsonProtocol.EmitErr("No compatible images in the provided file list");
                return 1;
            }

            fileList.Sort((a, b) => string.Compare(
                Path.GetFileName(a), Path.GetFileName(b), StringComparison.OrdinalIgnoreCase));

            string filesTitle;
            if (args.NoTitle)
                filesTitle = "";
            else if (args.Title != null)
                filesTitle = args.Title;
            else
                filesTitle = Path.GetFileName(Path.GetFullPath(args.InputDir));

            string filesOutputPath;
            if (!string.IsNullOrEmpty(args.Output))
            {
                filesOutputPath = args.Output;
            }
            else
            {
                string currentDate = DateTime.Now.ToString("yyyy-MM-dd");
                filesOutputPath = Path.Combine(args.InputDir, $"{filesTitle}_{currentDate}.pdf");
            }

            var filesLayout = BuildLayout(args);

            var (filesPath, filesPages) = PdfRenderer.CreatePdf(
                fileList, filesTitle, filesOutputPath, filesLayout,
                pageNumbers: !args.NoPageNumbers,
                benchmark: benchmark,
                ct: Cts.Token);

            if (benchmark)
                JsonProtocol.EmitTiming("total", totalSw.Elapsed.TotalMilliseconds);
            JsonProtocol.EmitDone(filesPath, filesPages);

            return 0;
        }

        // Normal (non-sectioned) mode
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var imageFiles = ImageScanner.ScanImages(args.InputDir, recursive: args.Recursive);
        if (benchmark)
            JsonProtocol.EmitTiming("scan", sw.Elapsed.TotalMilliseconds);

        if (imageFiles.Count == 0)
        {
            JsonProtocol.EmitErr($"No compatible images found in: {args.InputDir}");
            return 1;
        }

        string folderName;
        if (args.NoTitle)
            folderName = "";
        else if (args.Title != null)
            folderName = args.Title;
        else
            folderName = Path.GetFileName(Path.GetFullPath(args.InputDir));

        string outputPath;
        if (!string.IsNullOrEmpty(args.Output))
        {
            outputPath = args.Output;
        }
        else
        {
            string currentDate = DateTime.Now.ToString("yyyy-MM-dd");
            outputPath = Path.Combine(args.InputDir, $"{folderName}_{currentDate}.pdf");
        }

        var normalLayout = BuildLayout(args);

        var (path, pages) = PdfRenderer.CreatePdf(
            imageFiles, folderName, outputPath, normalLayout,
            pageNumbers: !args.NoPageNumbers,
            benchmark: benchmark,
            ct: Cts.Token);

        if (benchmark)
            JsonProtocol.EmitTiming("total", totalSw.Elapsed.TotalMilliseconds);
        JsonProtocol.EmitDone(path, pages);

        return 0;
    }

    private static LayoutConfig BuildLayout(CliArgs args) =>
        new(
            cols: args.Cols,
            rows: args.Rows,
            landscape: args.Landscape,
            quality: args.Quality,
            border: args.Border,
            headerSpace: args.HeaderSpace,
            filenameFontSize: args.FilenameFontSize,
            titleFontSize: args.TitleFontSize,
            jpegCompression: args.JpegCompression);
}

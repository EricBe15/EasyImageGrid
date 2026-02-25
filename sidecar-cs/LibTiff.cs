using System.Buffers.Binary;
using System.Runtime.InteropServices;
using SkiaSharp;

namespace EasyImageGridSidecar;

/// <summary>
/// Native libtiff wrapper for fast TIFF decode (including CMYK).
/// Uses direct function pointers (no DllImport) for AOT compatibility.
/// Reads TIFF header manually to avoid TIFFGetField (variadic, broken on ARM64).
/// </summary>
public static unsafe class LibTiff
{
    private static readonly string[] SearchPaths = [
        "/opt/homebrew/lib/libtiff.dylib",
        "/usr/local/lib/libtiff.dylib",
        "/usr/lib/x86_64-linux-gnu/libtiff.so.6",
        "/usr/lib/x86_64-linux-gnu/libtiff.so",
        "/usr/lib/libtiff.so.6",
        "/usr/lib/libtiff.so",
    ];

    // Only need two functions — TIFFOpen, TIFFClose, and TIFFReadRGBAImageOriented.
    // All non-variadic, so safe on ARM64.
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate IntPtr TIFFOpenDelegate(
        [MarshalAs(UnmanagedType.LPUTF8Str)] string filename,
        [MarshalAs(UnmanagedType.LPUTF8Str)] string mode);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate void TIFFCloseDelegate(IntPtr tif);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate int TIFFReadRGBAImageOrientedDelegate(
        IntPtr tif, int width, int height, IntPtr raster, int orientation, int stop);

    private static TIFFOpenDelegate? _open;
    private static TIFFCloseDelegate? _close;
    private static TIFFReadRGBAImageOrientedDelegate? _readRGBA;

    private static readonly Lazy<bool> _lazyAvailable = new(Initialize);
    public static bool IsAvailable => _lazyAvailable.Value;

    private static bool Initialize()
    {
        IntPtr lib = IntPtr.Zero;

        foreach (var p in SearchPaths)
        {
            if (File.Exists(p) && NativeLibrary.TryLoad(p, out lib))
                break;
        }

        if (lib == IntPtr.Zero) NativeLibrary.TryLoad("libtiff.6", out lib);
        if (lib == IntPtr.Zero) NativeLibrary.TryLoad("libtiff", out lib);
        if (lib == IntPtr.Zero) return false;

        try
        {
            _open = Marshal.GetDelegateForFunctionPointer<TIFFOpenDelegate>(
                NativeLibrary.GetExport(lib, "TIFFOpen"));
            _close = Marshal.GetDelegateForFunctionPointer<TIFFCloseDelegate>(
                NativeLibrary.GetExport(lib, "TIFFClose"));
            _readRGBA = Marshal.GetDelegateForFunctionPointer<TIFFReadRGBAImageOrientedDelegate>(
                NativeLibrary.GetExport(lib, "TIFFReadRGBAImageOriented"));
            return true;
        }
        catch
        {
            return false;
        }
    }

    private const int ORIENTATION_TOPLEFT = 1;

    /// <summary>
    /// Read TIFF dimensions from the IFD header directly (no libtiff needed).
    /// Avoids the variadic TIFFGetField function which is broken on ARM64.
    /// </summary>
    public static (int Width, int Height)? GetDimensions(string file)
    {
        try
        {
            using var fs = File.OpenRead(file);
            Span<byte> header = stackalloc byte[8];
            if (fs.Read(header) < 8) return null;

            bool littleEndian;
            if (header[0] == (byte)'I' && header[1] == (byte)'I') littleEndian = true;
            else if (header[0] == (byte)'M' && header[1] == (byte)'M') littleEndian = false;
            else return null;

            ushort magic = littleEndian
                ? BinaryPrimitives.ReadUInt16LittleEndian(header[2..])
                : BinaryPrimitives.ReadUInt16BigEndian(header[2..]);
            if (magic != 42) return null;

            uint ifdOffset = littleEndian
                ? BinaryPrimitives.ReadUInt32LittleEndian(header[4..])
                : BinaryPrimitives.ReadUInt32BigEndian(header[4..]);

            fs.Seek(ifdOffset, SeekOrigin.Begin);
            Span<byte> countBuf = stackalloc byte[2];
            if (fs.Read(countBuf) < 2) return null;

            ushort entryCount = littleEndian
                ? BinaryPrimitives.ReadUInt16LittleEndian(countBuf)
                : BinaryPrimitives.ReadUInt16BigEndian(countBuf);

            int width = 0, height = 0;
            Span<byte> entry = stackalloc byte[12];

            for (int i = 0; i < entryCount && (width == 0 || height == 0); i++)
            {
                if (fs.Read(entry) < 12) return null;

                ushort tag = littleEndian
                    ? BinaryPrimitives.ReadUInt16LittleEndian(entry)
                    : BinaryPrimitives.ReadUInt16BigEndian(entry);
                ushort type = littleEndian
                    ? BinaryPrimitives.ReadUInt16LittleEndian(entry[2..])
                    : BinaryPrimitives.ReadUInt16BigEndian(entry[2..]);

                int value;
                if (type == 3) // SHORT
                    value = littleEndian
                        ? BinaryPrimitives.ReadUInt16LittleEndian(entry[8..])
                        : BinaryPrimitives.ReadUInt16BigEndian(entry[8..]);
                else // LONG or other
                    value = (int)(littleEndian
                        ? BinaryPrimitives.ReadUInt32LittleEndian(entry[8..])
                        : BinaryPrimitives.ReadUInt32BigEndian(entry[8..]));

                if (tag == 256) width = value;   // ImageWidth
                else if (tag == 257) height = value; // ImageLength
            }

            if (width > 0 && height > 0)
                return (width, height);
        }
        catch
        {
            // ignore
        }

        return null;
    }

    /// <summary>
    /// Decode any TIFF (including CMYK) to RGBA pixels via native libtiff.
    /// Caller provides width/height (from GetDimensions or other source).
    /// </summary>
    public static SKBitmap? DecodeToSKBitmap(string file, int width, int height)
    {
        if (!IsAvailable) return null;

        var tif = _open!(file, "r");
        if (tif == IntPtr.Zero) return null;

        try
        {
            long pixelCount = (long)width * height;
            if (pixelCount > 250_000_000)
            {
                Console.Error.WriteLine($"Warning: TIFF dimensions too large ({width}x{height}), skipping");
                return null;
            }
            var buffer = Marshal.AllocHGlobal((int)(pixelCount * 4));

            try
            {
                int ok = _readRGBA!(tif, width, height, buffer, ORIENTATION_TOPLEFT, 0);
                if (ok == 0) return null;

                // libtiff stores as uint32: A<<24 | B<<16 | G<<8 | R
                // Little-endian memory: [R, G, B, A] — matches SKColorType.Rgba8888
                var bmp = new SKBitmap(width, height, SKColorType.Rgba8888, SKAlphaType.Opaque);
                Buffer.MemoryCopy(
                    (void*)buffer,
                    (void*)bmp.GetPixels(),
                    pixelCount * 4,
                    pixelCount * 4);

                return bmp;
            }
            finally
            {
                Marshal.FreeHGlobal(buffer);
            }
        }
        finally
        {
            _close!(tif);
        }
    }
}

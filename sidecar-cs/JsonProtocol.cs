using System.Text.Json;
using System.Text.Json.Serialization;

namespace EasyImageGridSidecar;

/// <summary>
/// JSON-lines protocol for communication with the Electron main process.
/// Uses System.Text.Json source generators for AOT compatibility.
/// Each Emit method uses the typed serializer info — no reflection.
/// </summary>
public static class JsonProtocol
{
    public static void EmitProgress(int current, int total, string file)
    {
        var msg = new ProgressMessage { Current = current, Total = total, File = file };
        Console.WriteLine(JsonSerializer.Serialize(msg, ProtocolContext.Default.ProgressMessage));
        Console.Out.Flush();
    }

    public static void EmitDone(string output, int pages)
    {
        var msg = new DoneMessage { Output = output, Pages = pages };
        Console.WriteLine(JsonSerializer.Serialize(msg, ProtocolContext.Default.DoneMessage));
        Console.Out.Flush();
    }

    public static void EmitDoneMulti(string output, int pages, List<string> files)
    {
        var msg = new DoneMultiMessage { Output = output, Pages = pages, Files = files };
        Console.WriteLine(JsonSerializer.Serialize(msg, ProtocolContext.Default.DoneMultiMessage));
        Console.Out.Flush();
    }

    public static void EmitErr(string message)
    {
        var msg = new ErrorMessage { Message = message };
        Console.Error.WriteLine(JsonSerializer.Serialize(msg, ProtocolContext.Default.ErrorMessage));
        Console.Error.Flush();
    }

    public static void EmitTiming(string phase, double ms)
    {
        var msg = new TimingMessage { Phase = phase, Ms = Math.Round(ms, 2) };
        Console.WriteLine(JsonSerializer.Serialize(msg, ProtocolContext.Default.TimingMessage));
        Console.Out.Flush();
    }

    public static List<SectionInput> DeserializeSections(string json)
    {
        return JsonSerializer.Deserialize(json, ProtocolContext.Default.ListSectionInput)
            ?? throw new InvalidOperationException("Failed to parse sections JSON");
    }

    public static List<string> DeserializeFileList(string json)
    {
        return JsonSerializer.Deserialize(json, ProtocolContext.Default.ListString)
            ?? throw new InvalidOperationException("Failed to parse file list JSON");
    }
}

public sealed class ProgressMessage
{
    [JsonPropertyName("type")] public string Type => "progress";
    [JsonPropertyName("current")] public int Current { get; init; }
    [JsonPropertyName("total")] public int Total { get; init; }
    [JsonPropertyName("file")] public string File { get; init; } = "";
}

public sealed class DoneMessage
{
    [JsonPropertyName("type")] public string Type => "done";
    [JsonPropertyName("output")] public string Output { get; init; } = "";
    [JsonPropertyName("pages")] public int Pages { get; init; }
}

public sealed class DoneMultiMessage
{
    [JsonPropertyName("type")] public string Type => "done";
    [JsonPropertyName("output")] public string Output { get; init; } = "";
    [JsonPropertyName("pages")] public int Pages { get; init; }
    [JsonPropertyName("files")] public List<string> Files { get; init; } = [];
}

public sealed class ErrorMessage
{
    [JsonPropertyName("type")] public string Type => "error";
    [JsonPropertyName("message")] public string Message { get; init; } = "";
}

public sealed class TimingMessage
{
    [JsonPropertyName("type")] public string Type => "timing";
    [JsonPropertyName("phase")] public string Phase { get; init; } = "";
    [JsonPropertyName("ms")] public double Ms { get; init; }
}

public sealed class SectionInput
{
    [JsonPropertyName("folder_path")] public string FolderPath { get; set; } = "";
    [JsonPropertyName("display_name")] public string DisplayName { get; set; } = "";
}

[JsonSerializable(typeof(ProgressMessage))]
[JsonSerializable(typeof(DoneMessage))]
[JsonSerializable(typeof(DoneMultiMessage))]
[JsonSerializable(typeof(ErrorMessage))]
[JsonSerializable(typeof(TimingMessage))]
[JsonSerializable(typeof(SectionInput))]
[JsonSerializable(typeof(List<SectionInput>))]
[JsonSerializable(typeof(List<string>))]
internal partial class ProtocolContext : JsonSerializerContext
{
}

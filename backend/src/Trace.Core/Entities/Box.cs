namespace Trace.Core.Entities;

/// <summary>
/// A box of answer copies (formerly "Copy"). Mirrors the source schema's columns;
/// copynumber is the identifier and QR value. Belongs to one session.
/// </summary>
public class Box
{
    public int Id { get; set; }
    public int SessionId { get; set; }
    public Session? Session { get; set; }
    public string CenterName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    /// <summary>The QR value.</summary>
    public string CopyNumber { get; set; } = string.Empty;
    public int PacketNumber { get; set; }
    public int SubjectId { get; set; }
    public int BagNo { get; set; }
}

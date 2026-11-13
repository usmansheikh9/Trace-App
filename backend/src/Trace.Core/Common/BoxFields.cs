namespace Trace.Core.Common;

/// <summary>Box field keys a role can list in visible_fields. They match the BoxDto JSON names.</summary>
public static class BoxFields
{
    public const string CenterName = "centerName";
    public const string Subject = "subject";
    public const string Version = "version";
    public const string CopyNumber = "copyNumber";
    public const string PacketNumber = "packetNumber";
    public const string SubjectId = "subjectId";
    public const string BagNo = "bagNo";

    public static readonly IReadOnlyList<string> All =
        [CenterName, Subject, Version, CopyNumber, PacketNumber, SubjectId, BagNo];
}

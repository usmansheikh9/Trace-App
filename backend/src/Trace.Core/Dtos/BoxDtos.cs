using Trace.Core.Entities;

namespace Trace.Core.Dtos;

/// <summary>One step of the box's session workflow and whether this box has completed it.</summary>
public record StageProgressDto(
    string StageName,
    int Position,
    bool Done,
    string? CompletedByName,
    DateTime? CompletedAt);

/// <summary>
/// Lookup result: every box field (the app filters by the role's visibleFields) plus
/// the box's workflow progress, in stage order.
/// </summary>
public record BoxDto(
    string CenterName,
    string Subject,
    string Version,
    string CopyNumber,
    int PacketNumber,
    int SubjectId,
    int BagNo,
    IReadOnlyList<StageProgressDto> Workflow);

/// <summary>Admin view; carries the id and session.</summary>
public record AdminBoxDto(
    int Id,
    int SessionId,
    string? SessionName,
    string CenterName,
    string Subject,
    string Version,
    string CopyNumber,
    int PacketNumber,
    int SubjectId,
    int BagNo)
{
    public static AdminBoxDto From(Box b) =>
        new(b.Id, b.SessionId, b.Session?.Name, b.CenterName, b.Subject, b.Version, b.CopyNumber,
            b.PacketNumber, b.SubjectId, b.BagNo);
}

public record CreateBoxRequest(
    int? SessionId,
    string? CenterName,
    string? Subject,
    string? Version,
    string? CopyNumber,
    int? PacketNumber,
    int? SubjectId,
    int? BagNo);

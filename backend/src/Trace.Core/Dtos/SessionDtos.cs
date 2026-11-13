using Trace.Core.Entities;

namespace Trace.Core.Dtos;

/// <summary>A work session as the app sees it. (SessionDto is the login session.)</summary>
public record SessionRefDto(int Id, string Name)
{
    public static SessionRefDto From(Session s) => new(s.Id, s.Name);
}

/// <summary>Admin view of a work session: workflow stage names in order, and how many users and boxes it holds.</summary>
public record AdminSessionDto(
    int Id,
    string Name,
    bool IsActive,
    IReadOnlyList<string> Stages,
    int UserCount,
    int BoxCount,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public static AdminSessionDto From(Session s, int userCount, int boxCount) =>
        new(s.Id, s.Name, s.IsActive, s.Stages.OrderBy(x => x.Position).Select(x => x.StageName).ToList(),
            userCount, boxCount, s.CreatedAt, s.UpdatedAt);
}

/// <summary>Body for both create and update.</summary>
public record SaveSessionRequest(string? Name, bool IsActive = true);

/// <summary>
/// A workflow step. ScanCount is how many of the session's boxes have a record at this stage:
/// removing or renaming a stage with records orphans their progress, so the portal warns first.
/// </summary>
public record WorkflowStageDto(string StageName, int Position, int ScanCount);

public record WorkflowDto(int SessionId, IReadOnlyList<WorkflowStageDto> Stages)
{
    /// <param name="scanCounts">Records per stage, keyed by lower-cased stage name.</param>
    public static WorkflowDto From(int sessionId, IEnumerable<WorkflowStage> stages, IReadOnlyDictionary<string, int> scanCounts) =>
        new(sessionId, stages
            .OrderBy(s => s.Position)
            .Select(s => new WorkflowStageDto(s.StageName, s.Position, scanCounts.GetValueOrDefault(s.StageName.Trim().ToLowerInvariant())))
            .ToList());
}

/// <summary>Replaces the whole ordered stage list; positions follow array order (1-based).</summary>
public record SaveWorkflowRequest(List<string>? Stages);

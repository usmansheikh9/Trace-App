using Trace.Core.Dtos;
using Trace.Core.Entities;

namespace Trace.Core.Services;

/// <summary>Workflow rules shared by lookup (progress) and save (gating).</summary>
public static class Workflow
{
    /// <summary>
    /// Stage names match case-insensitively, so a role's "received" lines up with a workflow's
    /// "Received". Records are stored under the workflow's spelling.
    /// </summary>
    public static bool SameStage(string a, string b) => string.Equals(a.Trim(), b.Trim(), StringComparison.OrdinalIgnoreCase);

    public static WorkflowStage? Find(IReadOnlyList<WorkflowStage> stages, string? stageName) =>
        stageName is null ? null : stages.FirstOrDefault(s => SameStage(s.StageName, stageName));

    /// <summary>The stage immediately before <paramref name="stage"/>, or null for the first stage.</summary>
    public static WorkflowStage? Previous(IReadOnlyList<WorkflowStage> stages, WorkflowStage stage) =>
        stages.Where(s => s.Position < stage.Position).MaxBy(s => s.Position);

    /// <summary>Per-stage completion for a box, in workflow order, from its scan records.</summary>
    public static IReadOnlyList<StageProgressDto> Progress(
        IReadOnlyList<WorkflowStage> stages, IReadOnlyList<ScanRecord> records) =>
        stages
            .OrderBy(s => s.Position)
            .Select(s =>
            {
                var done = records.Where(r => SameStage(r.Stage, s.StageName)).MinBy(r => r.CreatedAt);
                return new StageProgressDto(s.StageName, s.Position, done is not null, done?.User?.Name, done?.CreatedAt);
            })
            .ToList();
}

namespace Trace.Core.Entities;

/// <summary>
/// The top of the hierarchy: a session owns its workflow (ordered stages), its users
/// and its boxes. Unrelated to the login session (SessionDto).
/// </summary>
public class Session
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public List<WorkflowStage> Stages { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>One step of a session's workflow. Positions run 1..n with no gaps.</summary>
public class WorkflowStage
{
    public int Id { get; set; }
    public int SessionId { get; set; }
    public Session? Session { get; set; }
    public string StageName { get; set; } = string.Empty;
    public int Position { get; set; }
}

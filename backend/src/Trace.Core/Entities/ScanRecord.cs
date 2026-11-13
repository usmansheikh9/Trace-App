namespace Trace.Core.Entities;

public class ScanRecord
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int RoleId { get; set; }
    public Role? Role { get; set; }
    public int BoxId { get; set; }
    public Box? Box { get; set; }
    public string CopyNumber { get; set; } = string.Empty;
    /// <summary>The workflow stage recorded: the caller's role save_stage, as named in the session workflow.</summary>
    public string Stage { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

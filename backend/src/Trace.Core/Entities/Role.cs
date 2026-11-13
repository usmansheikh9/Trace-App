namespace Trace.Core.Entities;

/// <summary>
/// The dynamic switch model. What a user can do in the app is driven by these
/// flags; the mobile app renders from them instead of a hard-coded role name.
/// </summary>
public class Role
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    /// <summary>Stage written onto a ScanRecord when a user with this role saves.</summary>
    public string? SaveStage { get; set; }
    public bool CanScan { get; set; }
    public bool CanFindCopy { get; set; }
    public bool CanSave { get; set; }
    public bool CanPrint { get; set; }
    /// <summary>Box field keys (see BoxFields) shown to this role. Stored as jsonb.</summary>
    public List<string> VisibleFields { get; set; } = [];
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

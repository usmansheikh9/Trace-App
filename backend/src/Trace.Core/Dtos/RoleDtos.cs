using Trace.Core.Entities;

namespace Trace.Core.Dtos;

/// <summary>What the app renders from: switches, save stage and the copy fields to show.</summary>
public record RoleConfigDto(
    int Id,
    string Name,
    string? SaveStage,
    bool CanScan,
    bool CanFindCopy,
    bool CanSave,
    bool CanPrint,
    IReadOnlyList<string> VisibleFields)
{
    public static RoleConfigDto From(Role r) =>
        new(r.Id, r.Name, r.SaveStage, r.CanScan, r.CanFindCopy, r.CanSave, r.CanPrint, r.VisibleFields);
}

/// <summary>Admin view of a role, including lifecycle fields.</summary>
public record RoleDto(
    int Id,
    string Name,
    string? SaveStage,
    bool CanScan,
    bool CanFindCopy,
    bool CanSave,
    bool CanPrint,
    IReadOnlyList<string> VisibleFields,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public static RoleDto From(Role r) =>
        new(r.Id, r.Name, r.SaveStage, r.CanScan, r.CanFindCopy, r.CanSave, r.CanPrint,
            r.VisibleFields, r.IsActive, r.CreatedAt, r.UpdatedAt);
}

/// <summary>Body for both create and update.</summary>
public record SaveRoleRequest(
    string? Name,
    string? SaveStage,
    bool CanScan,
    bool CanFindCopy,
    bool CanSave,
    bool CanPrint,
    List<string>? VisibleFields,
    bool IsActive = true);

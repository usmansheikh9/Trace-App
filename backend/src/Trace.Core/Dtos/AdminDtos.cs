using Trace.Core.Entities;

namespace Trace.Core.Dtos;

public record RoleRefDto(int Id, string Name);

public record AdminUserDto(
    int Id,
    string Name,
    string Cnic,
    string Email,
    DateOnly DateOfBirth,
    UserStatus Status,
    bool IsAdmin,
    RoleRefDto? Role,
    SessionRefDto? Session,
    int? ApprovedByUserId,
    DateTime? ApprovedAt,
    DateTime CreatedAt)
{
    public static AdminUserDto From(User u) =>
        new(u.Id, u.Name, Common.Cnic.Format(u.Cnic), u.Email, u.DateOfBirth, u.Status, u.IsAdmin,
            u.Role is null ? null : new RoleRefDto(u.Role.Id, u.Role.Name),
            u.Session is null ? null : SessionRefDto.From(u.Session),
            u.ApprovedByUserId, u.ApprovedAt, u.CreatedAt);
}

/// <summary>Approve, or reassign an approved user. Both are required: a user needs a role and a session to operate.</summary>
public record ApproveUserRequest(int? RoleId, int? SessionId);

public record SetMasterPasswordRequest(string? Value);

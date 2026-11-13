using Trace.Core.Common;
using Trace.Core.Dtos;
using Trace.Core.Entities;
using Trace.Core.Errors;
using Trace.Core.Interfaces;

namespace Trace.Core.Services;

public interface IAdminUserService
{
    Task<IReadOnlyList<AdminUserDto>> ListAsync(string? status, CancellationToken ct = default);
    Task<AdminUserDto> ApproveAsync(int adminId, int userId, ApproveUserRequest request, CancellationToken ct = default);
    Task<AdminUserDto> RejectAsync(int adminId, int userId, CancellationToken ct = default);
}

public class AdminUserService(
    IUserRepository users,
    IRoleRepository roles,
    ISessionRepository sessions,
    IClock clock) : IAdminUserService
{
    public async Task<IReadOnlyList<AdminUserDto>> ListAsync(string? status, CancellationToken ct = default)
    {
        UserStatus? filter = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<UserStatus>(status, ignoreCase: true, out var parsed) || !Enum.IsDefined(parsed))
                throw ValidationException.For("status", "Must be Pending, Approved or Rejected");
            filter = parsed;
        }

        var list = await users.ListAsync(filter, ct);
        return list.Select(AdminUserDto.From).ToList();
    }

    /// <summary>
    /// Approves and assigns a role and a session. Also used to change an approved user's role or
    /// session. Both are required: a user can't operate without either.
    /// </summary>
    public async Task<AdminUserDto> ApproveAsync(int adminId, int userId, ApproveUserRequest request, CancellationToken ct = default)
    {
        var v = new Validator();
        if (request.RoleId is null) v.Add("roleId", "Required");
        if (request.SessionId is null) v.Add("sessionId", "Required");
        v.ThrowIfAny();

        var user = await users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("User not found");
        var role = await roles.GetByIdAsync(request.RoleId!.Value, ct);
        if (role is null) v.Add("roleId", "Role not found");
        else if (!role.IsActive) v.Add("roleId", "Role is inactive");
        var session = await sessions.GetByIdAsync(request.SessionId!.Value, ct);
        if (session is null) v.Add("sessionId", "Session not found");
        else if (!session.IsActive) v.Add("sessionId", "Session is inactive");
        v.ThrowIfAny();

        var now = clock.UtcNow;
        user.Role = role;
        user.RoleId = role!.Id;
        user.Session = session;
        user.SessionId = session!.Id;
        if (user.Status != UserStatus.Approved || user.ApprovedByUserId is null)
        {
            user.Status = UserStatus.Approved;
            user.ApprovedByUserId = adminId;
            user.ApprovedAt = now;
        }
        user.UpdatedAt = now;
        await users.SaveChangesAsync(ct);
        return AdminUserDto.From(user);
    }

    public async Task<AdminUserDto> RejectAsync(int adminId, int userId, CancellationToken ct = default)
    {
        if (adminId == userId) throw new ConflictException("You cannot reject your own account");

        var user = await users.GetByIdAsync(userId, ct) ?? throw new NotFoundException("User not found");
        user.Status = UserStatus.Rejected;
        user.ApprovedByUserId = null;
        user.ApprovedAt = null;
        user.UpdatedAt = clock.UtcNow;
        await users.SaveChangesAsync(ct);
        return AdminUserDto.From(user);
    }
}

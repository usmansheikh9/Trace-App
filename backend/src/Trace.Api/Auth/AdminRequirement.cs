using Microsoft.AspNetCore.Authorization;
using Trace.Core.Entities;
using Trace.Core.Interfaces;

namespace Trace.Api.Auth;

/// <summary>
/// Admin access is read from the database on every request, like status and role,
/// so revoking is_admin (or rejecting the account) takes effect immediately.
/// </summary>
public class AdminRequirement : IAuthorizationRequirement;

public class AdminRequirementHandler(IUserRepository users) : AuthorizationHandler<AdminRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, AdminRequirement requirement)
    {
        if (!int.TryParse(context.User.FindFirst(Infrastructure.Security.TraceClaims.UserId)?.Value, out var userId))
            return;

        var ct = (context.Resource as HttpContext)?.RequestAborted ?? default;
        var user = await users.GetByIdAsync(userId, ct);
        if (user is { IsAdmin: true, Status: UserStatus.Approved })
            context.Succeed(requirement);
    }
}

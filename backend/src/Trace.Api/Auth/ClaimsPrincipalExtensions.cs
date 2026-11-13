using System.Security.Claims;
using Trace.Core.Errors;
using Trace.Infrastructure.Security;

namespace Trace.Api.Auth;

public static class ClaimsPrincipalExtensions
{
    public const string AdminPolicy = "Admin";

    public static int GetUserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(TraceClaims.UserId), out var id)
            ? id
            : throw new UnauthorizedException("Your session is no longer valid");
}

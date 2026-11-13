using Trace.Core.Entities;
using Trace.Core.Errors;
using Trace.Core.Interfaces;

namespace Trace.Core.Services;

/// <summary>
/// Shared checks for an authenticated caller. Status and role are read from the
/// database on every request, so an approval, rejection or role change applies
/// without waiting for the token to expire.
/// </summary>
public static class UserAccess
{
    public static void EnsureApproved(User user)
    {
        switch (user.Status)
        {
            case UserStatus.Pending:
                throw new CodedException(403, ErrorCodes.AccountPending,
                    "Your account is awaiting approval");
            case UserStatus.Rejected:
                throw new CodedException(403, ErrorCodes.AccountRejected,
                    "Your account has been rejected");
        }
    }

    /// <summary>The user's role if assigned and active; an inactive role counts as none.</summary>
    public static Role? ActiveRole(User user) => user.Role is { IsActive: true } role ? role : null;

    /// <summary>The user's work session if assigned and active; an inactive session counts as none.</summary>
    public static Session? ActiveSession(User user) => user.Session is { IsActive: true } s ? s : null;

    /// <summary>Requires an active work session (coded 403 no_session).</summary>
    public static Session RequireSession(User user) =>
        ActiveSession(user) ?? throw new CodedException(403, ErrorCodes.NoSession,
            "You're not assigned to an active session. Contact your manager.");

    /// <summary>A box outside the caller's session is off limits (coded 403 wrong_session).</summary>
    public static void EnsureSameSession(Session session, Box box)
    {
        if (box.SessionId != session.Id)
            throw new CodedException(403, ErrorCodes.WrongSession,
                "This box belongs to another session. You can only scan boxes in your own session.");
    }

    /// <summary>Loads the caller (with role and session) and requires an approved account.</summary>
    public static async Task<User> GetApprovedAsync(IUserRepository users, int userId, CancellationToken ct)
    {
        var user = await users.GetByIdAsync(userId, ct)
            ?? throw new UnauthorizedException("Your session is no longer valid");
        EnsureApproved(user);
        return user;
    }
}

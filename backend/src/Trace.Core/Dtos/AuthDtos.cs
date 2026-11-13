using System.Text.Json.Serialization;

namespace Trace.Core.Dtos;

public record LoginRequest(string? Cnic, string? Password);

public record RegisterRequest(
    string? Name,
    string? Cnic,
    string? Email,
    DateOnly? DateOfBirth,
    string? Password,
    string? MasterPassword);

/// <summary>
/// Matches the app's Session type: profile fields sit flat beside the token.
/// Role is the dynamic RoleConfig and Session the work session the user belongs to; each is
/// null until management assigns it (or while it's inactive). Cnic is "00000-0000000-0".
/// </summary>
public record SessionDto(
    string Token,
    DateTime ExpiresAt,
    string UserId,
    RoleConfigDto? Role,
    SessionRefDto? Session,
    string Name,
    string Cnic,
    string Email,
    DateOnly DateOfBirth);

/// <summary>{ status: "Approved", session } | { status: "Pending" }.</summary>
public record RegisterResponse(
    string Status,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] SessionDto? Session)
{
    public static RegisterResponse Approved(SessionDto session) => new("Approved", session);
    public static RegisterResponse Pending() => new("Pending", null);
}

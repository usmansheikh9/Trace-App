using System.Text.RegularExpressions;
using Trace.Core.Common;
using Trace.Core.Dtos;
using Trace.Core.Entities;
using Trace.Core.Errors;
using Trace.Core.Interfaces;

namespace Trace.Core.Services;

public interface IAuthService
{
    Task<RegisterResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<SessionDto> LoginAsync(LoginRequest request, CancellationToken ct = default);
}

public partial class AuthService(
    IUserRepository users,
    ISettingRepository settings,
    IPasswordService passwords,
    ITokenService tokens,
    IClock clock) : IAuthService
{
    public async Task<RegisterResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var v = new Validator();
        v.Require("name", request.Name).MaxLength("name", request.Name, 200);

        var cnic = Cnic.Normalize(request.Cnic);
        if (cnic is null) v.Add("cnic", "Enter a valid CNIC");

        var email = request.Email?.Trim() ?? string.Empty;
        if (!EmailPattern().IsMatch(email)) v.Add("email", "Enter a valid email");
        v.MaxLength("email", email, 320);

        var today = DateOnly.FromDateTime(clock.UtcNow);
        if (request.DateOfBirth is null) v.Add("dateOfBirth", "Required");
        else if (request.DateOfBirth >= today) v.Add("dateOfBirth", "Enter a valid date of birth");

        if (string.IsNullOrEmpty(request.Password)) v.Add("password", "Required");

        // Empty = self-registration (Pending). Present but wrong = a typo the admin can retry.
        var approved = !string.IsNullOrEmpty(request.MasterPassword);
        if (approved && !await MasterPasswordMatchesAsync(request.MasterPassword!, ct))
            v.Add("masterPassword", "Incorrect master password");
        v.ThrowIfAny();

        if (await users.CnicExistsAsync(cnic!, ct))
            throw new ConflictException("An account with this CNIC already exists");

        var now = clock.UtcNow;
        var user = new User
        {
            Name = request.Name!.Trim(),
            Cnic = cnic!,
            Email = email,
            DateOfBirth = request.DateOfBirth!.Value,
            PasswordHash = passwords.Hash(request.Password!),
            Status = approved ? UserStatus.Approved : UserStatus.Pending,
            ApprovedAt = approved ? now : null,
            CreatedAt = now,
            UpdatedAt = now,
        };
        users.Add(user);
        await users.SaveChangesAsync(ct);

        return approved ? RegisterResponse.Approved(CreateSession(user)) : RegisterResponse.Pending();
    }

    public async Task<SessionDto> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var v = new Validator();
        var cnic = Cnic.Normalize(request.Cnic);
        if (cnic is null) v.Add("cnic", "Enter a valid CNIC");
        if (string.IsNullOrEmpty(request.Password)) v.Add("password", "Required");
        v.ThrowIfAny();

        var user = await users.GetByCnicAsync(cnic!, ct);
        if (user is null || !passwords.Verify(user.PasswordHash, request.Password!))
            throw new UnauthorizedException("Invalid CNIC or password");

        UserAccess.EnsureApproved(user);
        return CreateSession(user);
    }

    private async Task<bool> MasterPasswordMatchesAsync(string masterPassword, CancellationToken ct)
    {
        var hash = await settings.GetValueAsync(Setting.MasterPasswordHashKey, ct);
        return hash is not null && passwords.Verify(hash, masterPassword);
    }

    private SessionDto CreateSession(User user)
    {
        var token = tokens.Issue(user);
        var role = UserAccess.ActiveRole(user);
        var session = UserAccess.ActiveSession(user);
        return new SessionDto(
            token.Token,
            token.ExpiresAt,
            user.Id.ToString(),
            role is null ? null : RoleConfigDto.From(role),
            session is null ? null : SessionRefDto.From(session),
            user.Name,
            Cnic.Format(user.Cnic),
            user.Email,
            user.DateOfBirth);
    }

    [GeneratedRegex(@"^\S+@\S+\.\S+$")]
    private static partial Regex EmailPattern();
}

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Trace.Core.Entities;
using Trace.Core.Interfaces;

namespace Trace.Infrastructure.Security;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    /// <summary>HS256 key; at least 32 bytes.</summary>
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "trace-api";
    public string Audience { get; set; } = "trace-app";
    public int ExpiryMinutes { get; set; } = 60 * 24 * 7;
}

/// <summary>The token carries identity only; status, role and admin are read from the database per request.</summary>
public static class TraceClaims
{
    public const string UserId = JwtRegisteredClaimNames.Sub;
}

/// <summary>ASP.NET Core PasswordHasher. Also hashes the shared master password.</summary>
public class PasswordService : IPasswordService
{
    private static readonly User Subject = new();
    private readonly PasswordHasher<User> _hasher = new();

    public string Hash(string password) => _hasher.HashPassword(Subject, password);

    public bool Verify(string hash, string password) =>
        _hasher.VerifyHashedPassword(Subject, hash, password) != PasswordVerificationResult.Failed;
}

public class TokenService(IOptions<JwtOptions> options, IClock clock) : ITokenService
{
    private readonly JwtOptions _opt = options.Value;

    public IssuedToken Issue(User user)
    {
        var now = clock.UtcNow;
        var expires = now.AddMinutes(_opt.ExpiryMinutes);
        var claims = new List<Claim>
        {
            new(TraceClaims.UserId, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Name, user.Name),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
        };
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opt.Secret));
        var token = new JwtSecurityToken(
            issuer: _opt.Issuer,
            audience: _opt.Audience,
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new IssuedToken(new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}

public class SystemClock : IClock
{
    public DateTime UtcNow => DateTime.UtcNow;
}

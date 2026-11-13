using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Trace.Core.Dtos;
using Trace.Core.Services;

namespace Trace.Api.Controllers;

[ApiController]
[Route("auth")]
[EnableRateLimiting(RateLimitPolicy)]
public class AuthController(IAuthService auth) : ControllerBase
{
    public const string RateLimitPolicy = "auth";

    /// <summary>Approved (with session) when a valid master password is supplied, otherwise Pending.</summary>
    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponse>> Register(RegisterRequest request, CancellationToken ct) =>
        Ok(await auth.RegisterAsync(request, ct));

    /// <summary>403 account_pending / account_rejected for accounts that are not approved.</summary>
    [HttpPost("login")]
    public async Task<ActionResult<SessionDto>> Login(LoginRequest request, CancellationToken ct) =>
        Ok(await auth.LoginAsync(request, ct));
}

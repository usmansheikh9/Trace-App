using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Trace.Api.Auth;
using Trace.Core.Dtos;
using Trace.Core.Services;

namespace Trace.Api.Controllers;

[ApiController]
[Authorize]
[Route("me")]
public class MeController(IMeService me) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<MeDto>> Get(CancellationToken ct) =>
        Ok(await me.GetAsync(User.GetUserId(), ct));
}

[ApiController]
[Authorize]
[Route("boxes")]
public class BoxesController(IBoxService boxes) : ControllerBase
{
    /// <summary>
    /// Used by both Scan and Find Copy. Returns the box with its session's workflow progress.
    /// 404 when no box has that copy number; coded 403 wrong_session / no_session.
    /// </summary>
    [HttpGet("lookup")]
    public async Task<ActionResult<BoxDto>> Lookup([FromQuery] string? copyNumber, CancellationToken ct) =>
        Ok(await boxes.LookupAsync(User.GetUserId(), copyNumber, ct));
}

[ApiController]
[Authorize]
[Route("scans")]
public class ScansController(IScanService scans) : ControllerBase
{
    /// <summary>Requires the caller's role canSave. The stage comes from the role, not the client.</summary>
    [HttpPost]
    public async Task<ActionResult<ScanRecordDto>> Create(CreateScanRequest request, CancellationToken ct) =>
        Ok(await scans.SaveAsync(User.GetUserId(), request, ct));
}

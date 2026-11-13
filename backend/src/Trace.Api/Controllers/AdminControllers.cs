using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Trace.Api.Auth;
using Trace.Core.Dtos;
using Trace.Core.Services;

namespace Trace.Api.Controllers;

[ApiController]
[Authorize(Policy = ClaimsPrincipalExtensions.AdminPolicy)]
[Route("admin/users")]
public class AdminUsersController(IAdminUserService users) : ControllerBase
{
    /// <param name="status">Pending, Approved or Rejected. Omit for all.</param>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminUserDto>>> List([FromQuery] string? status, CancellationToken ct) =>
        Ok(await users.ListAsync(status, ct));

    /// <summary>Approves the user and assigns a role and a session. Also reassigns them for an approved user.</summary>
    [HttpPost("{id:int}/approve")]
    public async Task<ActionResult<AdminUserDto>> Approve(int id, ApproveUserRequest request, CancellationToken ct) =>
        Ok(await users.ApproveAsync(User.GetUserId(), id, request, ct));

    [HttpPost("{id:int}/reject")]
    public async Task<ActionResult<AdminUserDto>> Reject(int id, CancellationToken ct) =>
        Ok(await users.RejectAsync(User.GetUserId(), id, ct));
}

[ApiController]
[Authorize(Policy = ClaimsPrincipalExtensions.AdminPolicy)]
[Route("admin/roles")]
public class AdminRolesController(IRoleService roles) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoleDto>>> List(CancellationToken ct) =>
        Ok(await roles.ListAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RoleDto>> Get(int id, CancellationToken ct) =>
        Ok(await roles.GetAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<RoleDto>> Create(SaveRoleRequest request, CancellationToken ct) =>
        Ok(await roles.CreateAsync(request, ct));

    /// <summary>Full replace of the switches, saveStage, visibleFields and isActive.</summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<RoleDto>> Update(int id, SaveRoleRequest request, CancellationToken ct) =>
        Ok(await roles.UpdateAsync(id, request, ct));
}

[ApiController]
[Authorize(Policy = ClaimsPrincipalExtensions.AdminPolicy)]
[Route("admin/boxes")]
public class AdminBoxesController(IBoxService boxes) : ControllerBase
{
    /// <param name="sessionId">Only boxes in this session. Omit for all.</param>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminBoxDto>>> List(
        [FromQuery] int? sessionId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default) =>
        Ok(await boxes.ListAsync(sessionId, page, pageSize, ct));

    [HttpPost]
    public async Task<ActionResult<AdminBoxDto>> Create(CreateBoxRequest request, CancellationToken ct) =>
        Ok(await boxes.CreateAsync(request, ct));
}

[ApiController]
[Authorize(Policy = ClaimsPrincipalExtensions.AdminPolicy)]
[Route("admin/sessions")]
public class AdminSessionsController(ISessionService sessions) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminSessionDto>>> List(CancellationToken ct) =>
        Ok(await sessions.ListAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AdminSessionDto>> Get(int id, CancellationToken ct) =>
        Ok(await sessions.GetAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<AdminSessionDto>> Create(SaveSessionRequest request, CancellationToken ct) =>
        Ok(await sessions.CreateAsync(request, ct));

    /// <summary>Edit name and active.</summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<AdminSessionDto>> Update(int id, SaveSessionRequest request, CancellationToken ct) =>
        Ok(await sessions.UpdateAsync(id, request, ct));

    [HttpGet("{id:int}/workflow")]
    public async Task<ActionResult<WorkflowDto>> GetWorkflow(int id, CancellationToken ct) =>
        Ok(await sessions.GetWorkflowAsync(id, ct));

    /// <summary>Replaces the ordered stage list, e.g. { "stages": ["Received", "Cut", "Packed"] }.</summary>
    [HttpPut("{id:int}/workflow")]
    public async Task<ActionResult<WorkflowDto>> SaveWorkflow(int id, SaveWorkflowRequest request, CancellationToken ct) =>
        Ok(await sessions.SaveWorkflowAsync(id, request, ct));
}

[ApiController]
[Authorize(Policy = ClaimsPrincipalExtensions.AdminPolicy)]
[Route("admin/settings")]
public class AdminSettingsController(ISettingsService settings) : ControllerBase
{
    [HttpPut("master-password")]
    public async Task<IActionResult> SetMasterPassword(SetMasterPasswordRequest request, CancellationToken ct)
    {
        await settings.SetMasterPasswordAsync(request, ct);
        return NoContent();
    }
}

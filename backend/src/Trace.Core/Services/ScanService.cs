using Trace.Core.Dtos;
using Trace.Core.Entities;
using Trace.Core.Errors;
using Trace.Core.Interfaces;

namespace Trace.Core.Services;

public interface IScanService
{
    Task<ScanRecordDto> SaveAsync(int userId, CreateScanRequest request, CancellationToken ct = default);
}

public class ScanService(
    IUserRepository users,
    IBoxRepository boxes,
    ISessionRepository sessions,
    IScanRecordRepository scans,
    IClock clock) : IScanService
{
    public async Task<ScanRecordDto> SaveAsync(int userId, CreateScanRequest request, CancellationToken ct = default)
    {
        var user = await UserAccess.GetApprovedAsync(users, userId, ct);
        var role = UserAccess.ActiveRole(user);
        if (role is null || !role.CanSave)
            throw new ForbiddenException("Your role cannot save scans");
        // Stage comes from the role, never from the client.
        if (string.IsNullOrWhiteSpace(role.SaveStage))
            throw new ForbiddenException("Your role has no save stage configured");
        var session = UserAccess.RequireSession(user);

        var number = request.CopyNumber?.Trim();
        if (string.IsNullOrEmpty(number)) throw ValidationException.For("copyNumber", "Required");

        var box = await boxes.GetByCopyNumberAsync(number, ct)
            ?? throw new NotFoundException("Box not found");
        UserAccess.EnsureSameSession(session, box);

        // The role's stage must be a step of this session's workflow.
        var stages = await sessions.GetStagesAsync(box.SessionId, ct);
        var stage = Workflow.Find(stages, role.SaveStage)
            ?? throw new CodedException(403, ErrorCodes.StageNotInWorkflow,
                $"Your role's stage ({role.SaveStage}) isn't part of this session's workflow.");

        // Once per stage. Checked before order so a repeat scan gets the more useful answer.
        if (await scans.ExistsAsync(box.Id, stage.StageName, ct)) throw AlreadyScanned();

        // Strict order: every stage after the first needs the stage immediately before it.
        var previous = Workflow.Previous(stages, stage);
        if (previous is not null && !await scans.ExistsAsync(box.Id, previous.StageName, ct))
            throw new CodedException(409, ErrorCodes.OutOfOrder, $"Must be {previous.StageName} first.");

        var record = new ScanRecord
        {
            UserId = user.Id,
            RoleId = role.Id,
            BoxId = box.Id,
            CopyNumber = box.CopyNumber,
            Stage = stage.StageName,
            CreatedAt = clock.UtcNow,
        };
        // The unique index on (box_id, stage) settles concurrent saves.
        if (!await scans.TryAddAsync(record, ct)) throw AlreadyScanned();
        return ScanRecordDto.From(record);
    }

    private static CodedException AlreadyScanned() =>
        new(409, ErrorCodes.AlreadyScanned, "This box was already scanned at this stage");
}

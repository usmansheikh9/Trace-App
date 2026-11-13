using Trace.Core.Common;
using Trace.Core.Dtos;
using Trace.Core.Entities;
using Trace.Core.Errors;
using Trace.Core.Interfaces;

namespace Trace.Core.Services;

public interface IBoxService
{
    /// <summary>Scan and Find Copy lookup for a mobile user, with the box's workflow progress.</summary>
    Task<BoxDto> LookupAsync(int userId, string? copyNumber, CancellationToken ct = default);
    Task<IReadOnlyList<AdminBoxDto>> ListAsync(int? sessionId, int page, int pageSize, CancellationToken ct = default);
    Task<AdminBoxDto> CreateAsync(CreateBoxRequest request, CancellationToken ct = default);
}

public class BoxService(
    IUserRepository users,
    IBoxRepository boxes,
    ISessionRepository sessions,
    IScanRecordRepository scans) : IBoxService
{
    public const int MaxPageSize = 500;

    public async Task<BoxDto> LookupAsync(int userId, string? copyNumber, CancellationToken ct = default)
    {
        var user = await UserAccess.GetApprovedAsync(users, userId, ct);
        var role = UserAccess.ActiveRole(user);
        if (role is null || !(role.CanScan || role.CanFindCopy))
            throw new ForbiddenException("Your role cannot look up boxes");
        var session = UserAccess.RequireSession(user);

        var number = copyNumber?.Trim();
        if (string.IsNullOrEmpty(number)) throw ValidationException.For("copyNumber", "Required");

        var box = await boxes.GetByCopyNumberAsync(number, ct)
            ?? throw new NotFoundException("Box not found");
        UserAccess.EnsureSameSession(session, box);

        var stages = await sessions.GetStagesAsync(box.SessionId, ct);
        var records = await scans.ListForBoxAsync(box.Id, ct);
        return new BoxDto(
            box.CenterName, box.Subject, box.Version, box.CopyNumber, box.PacketNumber, box.SubjectId, box.BagNo,
            Workflow.Progress(stages, records));
    }

    public async Task<IReadOnlyList<AdminBoxDto>> ListAsync(int? sessionId, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);
        var list = await boxes.ListAsync(sessionId, (page - 1) * pageSize, pageSize, ct);
        return list.Select(AdminBoxDto.From).ToList();
    }

    public async Task<AdminBoxDto> CreateAsync(CreateBoxRequest request, CancellationToken ct = default)
    {
        var v = new Validator();
        if (request.SessionId is null) v.Add("sessionId", "Required");
        v.Require("centerName", request.CenterName);
        v.Require("subject", request.Subject).MaxLength("subject", request.Subject, 20);
        v.Require("version", request.Version).MaxLength("version", request.Version, 2);
        v.Require("copyNumber", request.CopyNumber).MaxLength("copyNumber", request.CopyNumber, 10);
        if (request.PacketNumber is null) v.Add("packetNumber", "Required");
        if (request.SubjectId is null) v.Add("subjectId", "Required");
        if (request.BagNo is null) v.Add("bagNo", "Required");

        Session? session = null;
        if (request.SessionId is not null)
        {
            session = await sessions.GetByIdAsync(request.SessionId.Value, ct);
            if (session is null) v.Add("sessionId", "Session not found");
        }
        v.ThrowIfAny();

        var number = request.CopyNumber!.Trim();
        if (await boxes.CopyNumberExistsAsync(number, ct))
            throw new ConflictException($"Box {number} already exists");

        var box = new Box
        {
            Session = session,
            SessionId = session!.Id,
            CenterName = request.CenterName!.Trim(),
            Subject = request.Subject!.Trim(),
            Version = request.Version!.Trim(),
            CopyNumber = number,
            PacketNumber = request.PacketNumber!.Value,
            SubjectId = request.SubjectId!.Value,
            BagNo = request.BagNo!.Value,
        };
        boxes.Add(box);
        await boxes.SaveChangesAsync(ct);
        return AdminBoxDto.From(box);
    }
}

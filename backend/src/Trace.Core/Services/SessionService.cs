using Trace.Core.Common;
using Trace.Core.Dtos;
using Trace.Core.Entities;
using Trace.Core.Errors;
using Trace.Core.Interfaces;

namespace Trace.Core.Services;

public interface ISessionService
{
    Task<IReadOnlyList<AdminSessionDto>> ListAsync(CancellationToken ct = default);
    Task<AdminSessionDto> GetAsync(int id, CancellationToken ct = default);
    Task<AdminSessionDto> CreateAsync(SaveSessionRequest request, CancellationToken ct = default);
    Task<AdminSessionDto> UpdateAsync(int id, SaveSessionRequest request, CancellationToken ct = default);
    Task<WorkflowDto> GetWorkflowAsync(int id, CancellationToken ct = default);
    Task<WorkflowDto> SaveWorkflowAsync(int id, SaveWorkflowRequest request, CancellationToken ct = default);
}

public class SessionService(
    ISessionRepository sessions,
    IUserRepository users,
    IBoxRepository boxes,
    IScanRecordRepository scans,
    IClock clock) : ISessionService
{
    public const int MaxStageLength = 100;

    public async Task<IReadOnlyList<AdminSessionDto>> ListAsync(CancellationToken ct = default)
    {
        var list = await sessions.ListAsync(ct);
        var userCounts = await users.CountBySessionAsync(ct);
        var boxCounts = await boxes.CountBySessionAsync(ct);
        return list.Select(s => AdminSessionDto.From(s, userCounts.GetValueOrDefault(s.Id), boxCounts.GetValueOrDefault(s.Id))).ToList();
    }

    public async Task<AdminSessionDto> GetAsync(int id, CancellationToken ct = default) => await ToDto(await Load(id, ct), ct);

    public async Task<AdminSessionDto> CreateAsync(SaveSessionRequest request, CancellationToken ct = default)
    {
        var name = ValidateName(request);
        if (await sessions.NameExistsAsync(name, null, ct))
            throw new ConflictException($"A session named {name} already exists");

        var now = clock.UtcNow;
        var session = new Session { Name = name, IsActive = request.IsActive, CreatedAt = now, UpdatedAt = now };
        sessions.Add(session);
        await sessions.SaveChangesAsync(ct);
        return AdminSessionDto.From(session, 0, 0);
    }

    public async Task<AdminSessionDto> UpdateAsync(int id, SaveSessionRequest request, CancellationToken ct = default)
    {
        var session = await Load(id, ct);
        var name = ValidateName(request);
        if (await sessions.NameExistsAsync(name, id, ct))
            throw new ConflictException($"A session named {name} already exists");

        session.Name = name;
        session.IsActive = request.IsActive;
        session.UpdatedAt = clock.UtcNow;
        await sessions.SaveChangesAsync(ct);
        return await ToDto(session, ct);
    }

    public async Task<WorkflowDto> GetWorkflowAsync(int id, CancellationToken ct = default)
    {
        await Load(id, ct);
        return await WorkflowFor(id, ct);
    }

    public async Task<WorkflowDto> SaveWorkflowAsync(int id, SaveWorkflowRequest request, CancellationToken ct = default)
    {
        var session = await Load(id, ct);

        var names = (request.Stages ?? []).Select(s => s?.Trim() ?? string.Empty).ToList();
        if (names.Count == 0) throw ValidationException.For("stages", "Add at least one stage");
        if (names.Any(string.IsNullOrEmpty)) throw ValidationException.For("stages", "Stage names can't be blank");
        if (names.Any(n => n.Length > MaxStageLength))
            throw ValidationException.For("stages", $"Stage names must be at most {MaxStageLength} characters");
        var dupes = names.GroupBy(n => n, StringComparer.OrdinalIgnoreCase).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
        if (dupes.Count > 0)
            throw ValidationException.For("stages", $"Stage names must be unique: {string.Join(", ", dupes)}");

        await sessions.ReplaceStagesAsync(id, names, ct);
        session.UpdatedAt = clock.UtcNow;
        await sessions.SaveChangesAsync(ct);
        return await WorkflowFor(id, ct);
    }

    private async Task<WorkflowDto> WorkflowFor(int id, CancellationToken ct) =>
        WorkflowDto.From(id, await sessions.GetStagesAsync(id, ct), await scans.CountByStageAsync(id, ct));

    private async Task<AdminSessionDto> ToDto(Session s, CancellationToken ct)
    {
        var userCounts = await users.CountBySessionAsync(ct);
        var boxCounts = await boxes.CountBySessionAsync(ct);
        return AdminSessionDto.From(s, userCounts.GetValueOrDefault(s.Id), boxCounts.GetValueOrDefault(s.Id));
    }

    private async Task<Session> Load(int id, CancellationToken ct) =>
        await sessions.GetByIdAsync(id, ct) ?? throw new NotFoundException("Session not found");

    private static string ValidateName(SaveSessionRequest r)
    {
        new Validator().Require("name", r.Name).MaxLength("name", r.Name, 100).ThrowIfAny();
        return r.Name!.Trim();
    }
}

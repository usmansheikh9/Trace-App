using Microsoft.EntityFrameworkCore;
using Npgsql;
using Trace.Core.Entities;
using Trace.Core.Interfaces;
using Trace.Infrastructure.Data;

namespace Trace.Infrastructure.Repositories;

public class UserRepository(TraceDbContext db) : IUserRepository
{
    public Task<User?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.Users.Include(u => u.Role).Include(u => u.Session).FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task<User?> GetByCnicAsync(string cnic, CancellationToken ct = default) =>
        db.Users.Include(u => u.Role).Include(u => u.Session).FirstOrDefaultAsync(u => u.Cnic == cnic, ct);

    public Task<bool> CnicExistsAsync(string cnic, CancellationToken ct = default) =>
        db.Users.AnyAsync(u => u.Cnic == cnic, ct);

    public async Task<IReadOnlyList<User>> ListAsync(UserStatus? status, CancellationToken ct = default)
    {
        var q = db.Users.AsNoTracking().Include(u => u.Role).Include(u => u.Session).AsQueryable();
        if (status is not null) q = q.Where(u => u.Status == status);
        return await q.OrderByDescending(u => u.CreatedAt).ToListAsync(ct);
    }

    public async Task<IReadOnlyDictionary<int, int>> CountBySessionAsync(CancellationToken ct = default) =>
        await db.Users.Where(u => u.SessionId != null)
            .GroupBy(u => u.SessionId!.Value)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, ct);

    public void Add(User user) => db.Users.Add(user);

    public Task SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}

public class RoleRepository(TraceDbContext db) : IRoleRepository
{
    public Task<Role?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.Roles.FirstOrDefaultAsync(r => r.Id == id, ct);

    public Task<bool> NameExistsAsync(string name, int? excludeId = null, CancellationToken ct = default) =>
        db.Roles.AnyAsync(r => r.Name.ToLower() == name.ToLower() && (excludeId == null || r.Id != excludeId), ct);

    public async Task<IReadOnlyList<Role>> ListAsync(CancellationToken ct = default) =>
        await db.Roles.AsNoTracking().OrderBy(r => r.Id).ToListAsync(ct);

    public void Add(Role role) => db.Roles.Add(role);

    public Task SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}

public class SessionRepository(TraceDbContext db) : ISessionRepository
{
    public Task<Session?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.Sessions.Include(s => s.Stages).FirstOrDefaultAsync(s => s.Id == id, ct);

    public Task<bool> NameExistsAsync(string name, int? excludeId = null, CancellationToken ct = default) =>
        db.Sessions.AnyAsync(s => s.Name.ToLower() == name.ToLower() && (excludeId == null || s.Id != excludeId), ct);

    public async Task<IReadOnlyList<Session>> ListAsync(CancellationToken ct = default) =>
        await db.Sessions.AsNoTracking().Include(s => s.Stages).OrderBy(s => s.Id).ToListAsync(ct);

    public async Task<IReadOnlyList<WorkflowStage>> GetStagesAsync(int sessionId, CancellationToken ct = default) =>
        await db.WorkflowStages.AsNoTracking().Where(s => s.SessionId == sessionId).OrderBy(s => s.Position).ToListAsync(ct);

    public async Task ReplaceStagesAsync(int sessionId, IReadOnlyList<string> stageNames, CancellationToken ct = default)
    {
        // Two saves in one transaction: the old rows must be gone before the new ones take
        // their (session_id, position) and (session_id, stage_name) unique slots.
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var existing = await db.WorkflowStages.Where(s => s.SessionId == sessionId).ToListAsync(ct);
        db.WorkflowStages.RemoveRange(existing);
        await db.SaveChangesAsync(ct);

        db.WorkflowStages.AddRange(stageNames.Select((name, i) =>
            new WorkflowStage { SessionId = sessionId, StageName = name, Position = i + 1 }));
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    public void Add(Session session) => db.Sessions.Add(session);

    public Task SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}

public class BoxRepository(TraceDbContext db) : IBoxRepository
{
    public Task<Box?> GetByCopyNumberAsync(string copyNumber, CancellationToken ct = default) =>
        db.Boxes.AsNoTracking().FirstOrDefaultAsync(b => b.CopyNumber == copyNumber, ct);

    public Task<bool> CopyNumberExistsAsync(string copyNumber, CancellationToken ct = default) =>
        db.Boxes.AnyAsync(b => b.CopyNumber == copyNumber, ct);

    public async Task<IReadOnlyList<Box>> ListAsync(int? sessionId, int skip, int take, CancellationToken ct = default)
    {
        var q = db.Boxes.AsNoTracking().Include(b => b.Session).AsQueryable();
        if (sessionId is not null) q = q.Where(b => b.SessionId == sessionId);
        return await q.OrderBy(b => b.CopyNumber).Skip(skip).Take(take).ToListAsync(ct);
    }

    public async Task<IReadOnlyDictionary<int, int>> CountBySessionAsync(CancellationToken ct = default) =>
        await db.Boxes.GroupBy(b => b.SessionId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, ct);

    public void Add(Box box) => db.Boxes.Add(box);

    public Task SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}

public class ScanRecordRepository(TraceDbContext db) : IScanRecordRepository
{
    public Task<int> CountByUserAsync(int userId, CancellationToken ct = default) =>
        db.ScanRecords.CountAsync(s => s.UserId == userId, ct);

    // Case-insensitive, matching how workflow stages are compared (Workflow.SameStage).
    public Task<bool> ExistsAsync(int boxId, string stage, CancellationToken ct = default) =>
        db.ScanRecords.AnyAsync(s => s.BoxId == boxId && s.Stage.ToLower() == stage.ToLower(), ct);

    public async Task<IReadOnlyList<ScanRecord>> ListForBoxAsync(int boxId, CancellationToken ct = default) =>
        await db.ScanRecords.AsNoTracking().Include(s => s.User).Where(s => s.BoxId == boxId).ToListAsync(ct);

    public async Task<IReadOnlyDictionary<string, int>> CountByStageAsync(int sessionId, CancellationToken ct = default) =>
        await db.ScanRecords.Where(s => s.Box!.SessionId == sessionId)
            .GroupBy(s => s.Stage.Trim().ToLower())
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, ct);

    public async Task<bool> TryAddAsync(ScanRecord record, CancellationToken ct = default)
    {
        db.ScanRecords.Add(record);
        try
        {
            await db.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Lost a race with a concurrent save of the same box at the same stage.
            db.Entry(record).State = EntityState.Detached;
            return false;
        }
    }
}

public class SettingRepository(TraceDbContext db) : ISettingRepository
{
    public async Task<string?> GetValueAsync(string key, CancellationToken ct = default) =>
        (await db.Settings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == key, ct))?.Value;

    public async Task SetValueAsync(string key, string value, CancellationToken ct = default)
    {
        var setting = await db.Settings.FirstOrDefaultAsync(s => s.Key == key, ct);
        if (setting is null) db.Settings.Add(new Setting { Key = key, Value = value });
        else setting.Value = value;
    }

    public Task SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}

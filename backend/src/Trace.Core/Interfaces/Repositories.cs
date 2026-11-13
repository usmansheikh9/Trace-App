using Trace.Core.Entities;

namespace Trace.Core.Interfaces;

public interface IUserRepository
{
    /// <summary>Loads the user with their Role and Session.</summary>
    Task<User?> GetByIdAsync(int id, CancellationToken ct = default);
    /// <summary>Loads the user with their Role and Session.</summary>
    Task<User?> GetByCnicAsync(string cnic, CancellationToken ct = default);
    Task<bool> CnicExistsAsync(string cnic, CancellationToken ct = default);
    Task<IReadOnlyList<User>> ListAsync(UserStatus? status, CancellationToken ct = default);
    /// <summary>Users per session id (sessions with none are absent).</summary>
    Task<IReadOnlyDictionary<int, int>> CountBySessionAsync(CancellationToken ct = default);
    void Add(User user);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IRoleRepository
{
    Task<Role?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<bool> NameExistsAsync(string name, int? excludeId = null, CancellationToken ct = default);
    Task<IReadOnlyList<Role>> ListAsync(CancellationToken ct = default);
    void Add(Role role);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface ISessionRepository
{
    /// <summary>Loads the session with its workflow stages.</summary>
    Task<Session?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<bool> NameExistsAsync(string name, int? excludeId = null, CancellationToken ct = default);
    Task<IReadOnlyList<Session>> ListAsync(CancellationToken ct = default);
    /// <summary>The session's workflow, ordered by position.</summary>
    Task<IReadOnlyList<WorkflowStage>> GetStagesAsync(int sessionId, CancellationToken ct = default);
    /// <summary>Replaces the whole workflow atomically; positions follow list order (1-based). Saves.</summary>
    Task ReplaceStagesAsync(int sessionId, IReadOnlyList<string> stageNames, CancellationToken ct = default);
    void Add(Session session);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IBoxRepository
{
    Task<Box?> GetByCopyNumberAsync(string copyNumber, CancellationToken ct = default);
    Task<bool> CopyNumberExistsAsync(string copyNumber, CancellationToken ct = default);
    /// <summary>Ordered by copy number, with Session loaded. Null sessionId = all sessions.</summary>
    Task<IReadOnlyList<Box>> ListAsync(int? sessionId, int skip, int take, CancellationToken ct = default);
    /// <summary>Boxes per session id (sessions with none are absent).</summary>
    Task<IReadOnlyDictionary<int, int>> CountBySessionAsync(CancellationToken ct = default);
    void Add(Box box);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IScanRecordRepository
{
    Task<int> CountByUserAsync(int userId, CancellationToken ct = default);
    Task<bool> ExistsAsync(int boxId, string stage, CancellationToken ct = default);
    /// <summary>All records for a box, with User loaded (for "completed by").</summary>
    Task<IReadOnlyList<ScanRecord>> ListForBoxAsync(int boxId, CancellationToken ct = default);
    /// <summary>Records for the session's boxes, per lower-cased stage name.</summary>
    Task<IReadOnlyDictionary<string, int>> CountByStageAsync(int sessionId, CancellationToken ct = default);
    /// <summary>Inserts and saves. False when (box, stage) is already recorded (unique index).</summary>
    Task<bool> TryAddAsync(ScanRecord record, CancellationToken ct = default);
}

public interface ISettingRepository
{
    Task<string?> GetValueAsync(string key, CancellationToken ct = default);
    /// <summary>Inserts or updates; does not save.</summary>
    Task SetValueAsync(string key, string value, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}

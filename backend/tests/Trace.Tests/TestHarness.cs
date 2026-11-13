using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Options;
using Trace.Core.Common;
using Trace.Core.Entities;
using Trace.Core.Interfaces;
using Trace.Core.Services;
using Trace.Infrastructure.Data;
using Trace.Infrastructure.Repositories;
using Trace.Infrastructure.Security;

namespace Trace.Tests;

/// <summary>Real services and repositories over an isolated in-memory database.</summary>
public sealed class TestHarness : IDisposable
{
    public const string MasterPassword = "test-only-master-password";

    public TraceDbContext Db { get; }
    public FixedClock Clock { get; } = new(new DateTime(2026, 11, 13, 9, 0, 0, DateTimeKind.Utc));
    public IPasswordService Passwords { get; } = new PasswordService();

    public TestHarness()
    {
        Db = new TraceDbContext(new DbContextOptionsBuilder<TraceDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            // The workflow replace uses a transaction; the in-memory provider has none.
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);
        Db.Settings.Add(new Setting { Key = Setting.MasterPasswordHashKey, Value = Passwords.Hash(MasterPassword) });
        Db.SaveChanges();
    }

    public UserRepository Users => new(Db);
    public BoxRepository Boxes => new(Db);
    public SessionRepository Sessions => new(Db);
    public ScanRecordRepository Scans => new(Db);

    public AuthService Auth => new(
        Users,
        new SettingRepository(Db),
        Passwords,
        new TokenService(Options.Create(new JwtOptions { Secret = new string('x', 48), ExpiryMinutes = 60 }), Clock),
        Clock);

    public ScanService ScanService => new(Users, Boxes, Sessions, Scans, Clock);
    public BoxService BoxService => new(Users, Boxes, Sessions, Scans);
    public SessionService SessionService => new(Sessions, Users, Boxes, Scans, Clock);

    public Session AddSession(string name = "Session A", bool isActive = true, params string[] stages)
    {
        if (stages.Length == 0) stages = ["Received", "Cut", "Packed"];
        var session = new Session
        {
            Name = name,
            IsActive = isActive,
            Stages = stages.Select((s, i) => new WorkflowStage { StageName = s, Position = i + 1 }).ToList(),
        };
        Db.Sessions.Add(session);
        Db.SaveChanges();
        return session;
    }

    public Role AddRole(string name, bool canSave = true, string? stage = "Received", bool isActive = true, bool canScan = true)
    {
        var role = new Role
        {
            Name = name,
            SaveStage = stage,
            CanScan = canScan,
            CanSave = canSave,
            VisibleFields = [.. BoxFields.All],
            IsActive = isActive,
        };
        Db.Roles.Add(role);
        Db.SaveChanges();
        return role;
    }

    public User AddUser(string cnic, string password, UserStatus status, Role? role = null, Session? session = null, string name = "Test User")
    {
        var user = new User
        {
            Name = name,
            Cnic = cnic,
            Email = "test@example.com",
            DateOfBirth = new DateOnly(1996, 3, 14),
            PasswordHash = Passwords.Hash(password),
            Status = status,
            Role = role,
            Session = session,
        };
        Db.Users.Add(user);
        Db.SaveChanges();
        return user;
    }

    public Box AddBox(string copyNumber, Session session)
    {
        var box = new Box
        {
            Session = session,
            CopyNumber = copyNumber,
            CenterName = "Govt. High School No. 1",
            Subject = "Mathematics",
            Version = "A",
            PacketNumber = 101,
            SubjectId = 11,
            BagNo = 1,
        };
        Db.Boxes.Add(box);
        Db.SaveChanges();
        return box;
    }

    public void Dispose() => Db.Dispose();
}

public sealed class FixedClock(DateTime now) : IClock
{
    public DateTime UtcNow { get; set; } = now;
}

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Trace.Core.Common;
using Trace.Core.Entities;
using Trace.Core.Interfaces;

namespace Trace.Infrastructure.Data;

public class SeedOptions
{
    public const string SectionName = "Seed";

    public SeedAdminOptions? Admin { get; set; }
    /// <summary>Plain value hashed into settings, only when no master password is stored yet.</summary>
    public string? MasterPassword { get; set; }
    /// <summary>Sample roles and copies for development.</summary>
    public bool SampleData { get; set; }
}

public class SeedAdminOptions
{
    public string Cnic { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Name { get; set; } = "Administrator";
    public string Email { get; set; } = "admin@trace.local";
    public DateOnly DateOfBirth { get; set; } = new(1990, 1, 1);
}

/// <summary>Idempotent: adds only what is missing and never overwrites admin changes.</summary>
public class DbSeeder(
    TraceDbContext db,
    IPasswordService passwords,
    IClock clock,
    IOptions<SeedOptions> options,
    ILogger<DbSeeder> logger)
{
    private readonly SeedOptions _opt = options.Value;

    public async Task SeedAsync(CancellationToken ct = default)
    {
        await SeedAdminAsync(ct);
        await SeedMasterPasswordAsync(ct);
        if (_opt.SampleData)
        {
            await SeedRolesAsync(ct);
            var session = await SeedSessionAsync(ct);
            await SeedBoxesAsync(session, ct);
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task SeedAdminAsync(CancellationToken ct)
    {
        var admin = _opt.Admin;
        if (admin is null || string.IsNullOrEmpty(admin.Password)) return;

        var cnic = Cnic.Normalize(admin.Cnic);
        if (cnic is null)
        {
            logger.LogWarning("Seed:Admin:Cnic is not a valid CNIC; admin not seeded");
            return;
        }
        if (await db.Users.AnyAsync(u => u.Cnic == cnic, ct)) return;

        var now = clock.UtcNow;
        db.Users.Add(new User
        {
            Name = admin.Name,
            Cnic = cnic,
            Email = admin.Email,
            DateOfBirth = admin.DateOfBirth,
            PasswordHash = passwords.Hash(admin.Password),
            Status = UserStatus.Approved,
            IsAdmin = true,
            ApprovedAt = now,
            CreatedAt = now,
            UpdatedAt = now,
        });
        logger.LogInformation("Seeded admin user {Cnic}", Cnic.Format(cnic));
    }

    private async Task SeedMasterPasswordAsync(CancellationToken ct)
    {
        if (string.IsNullOrEmpty(_opt.MasterPassword)) return;
        if (await db.Settings.AnyAsync(s => s.Key == Setting.MasterPasswordHashKey, ct)) return;

        db.Settings.Add(new Setting
        {
            Key = Setting.MasterPasswordHashKey,
            Value = passwords.Hash(_opt.MasterPassword),
        });
        logger.LogInformation("Seeded master password");
    }

    private async Task SeedRolesAsync(CancellationToken ct)
    {
        if (await db.Roles.AnyAsync(ct)) return;

        var now = clock.UtcNow;
        Role Make(string name, string stage, bool find, bool print, params string[] fields) => new()
        {
            Name = name,
            SaveStage = stage,
            CanScan = true,
            CanSave = true,
            CanFindCopy = find,
            CanPrint = print,
            VisibleFields = fields.ToList(),
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.Roles.AddRange(
            Make("Receiver", "Received", find: false, print: false,
                BoxFields.CenterName, BoxFields.Subject, BoxFields.Version, BoxFields.CopyNumber, BoxFields.PacketNumber),
            Make("Cutter", "Cut", find: true, print: true,
                BoxFields.All.ToArray()),
            Make("Packer", "Packed", find: false, print: false,
                BoxFields.CenterName, BoxFields.Subject, BoxFields.CopyNumber, BoxFields.PacketNumber, BoxFields.BagNo));
        logger.LogInformation("Seeded sample roles");
    }

    /// <summary>
    /// The session sample boxes go into: the first existing one (on an upgraded database that's
    /// the migration's "Default Session"), or a new "Sample Session" with Received -> Cut -> Packed.
    /// </summary>
    private async Task<Session> SeedSessionAsync(CancellationToken ct)
    {
        var existing = await db.Sessions.OrderBy(s => s.Id).FirstOrDefaultAsync(ct);
        if (existing is not null) return existing;

        var now = clock.UtcNow;
        var session = new Session
        {
            Name = "Sample Session",
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
            Stages =
            [
                new() { StageName = "Received", Position = 1 },
                new() { StageName = "Cut", Position = 2 },
                new() { StageName = "Packed", Position = 3 },
            ],
        };
        db.Sessions.Add(session);
        logger.LogInformation("Seeded sample session with workflow Received -> Cut -> Packed");
        return session;
    }

    private async Task SeedBoxesAsync(Session session, CancellationToken ct)
    {
        Box[] samples =
        [
            new() { CopyNumber = "30000001", CenterName = "Govt. High School No. 1, Lahore", Subject = "Mathematics", Version = "A", PacketNumber = 101, SubjectId = 11, BagNo = 1 },
            new() { CopyNumber = "30000002", CenterName = "Govt. High School No. 1, Lahore", Subject = "Mathematics", Version = "B", PacketNumber = 101, SubjectId = 11, BagNo = 1 },
            new() { CopyNumber = "30000003", CenterName = "Govt. High School No. 1, Lahore", Subject = "Physics", Version = "A", PacketNumber = 102, SubjectId = 12, BagNo = 1 },
            new() { CopyNumber = "30000004", CenterName = "Govt. Girls High School, Model Town", Subject = "Chemistry", Version = "A", PacketNumber = 201, SubjectId = 13, BagNo = 2 },
            new() { CopyNumber = "30000005", CenterName = "Govt. Girls High School, Model Town", Subject = "English", Version = "B", PacketNumber = 202, SubjectId = 14, BagNo = 2 },
            new() { CopyNumber = "30000006", CenterName = "Govt. Comprehensive School, Gulberg", Subject = "Urdu", Version = "A", PacketNumber = 301, SubjectId = 15, BagNo = 3 },
            new() { CopyNumber = "30000007", CenterName = "Govt. Comprehensive School, Gulberg", Subject = "Biology", Version = "A", PacketNumber = 302, SubjectId = 16, BagNo = 3 },
            new() { CopyNumber = "30000008", CenterName = "Govt. Comprehensive School, Gulberg", Subject = "Computer Science", Version = "B", PacketNumber = 303, SubjectId = 17, BagNo = 3 },
        ];

        var numbers = samples.Select(s => s.CopyNumber).ToList();
        var existing = await db.Boxes.Where(b => numbers.Contains(b.CopyNumber)).Select(b => b.CopyNumber).ToListAsync(ct);
        var missing = samples.Where(s => !existing.Contains(s.CopyNumber)).ToList();
        if (missing.Count == 0) return;

        // Navigation, not SessionId: the session may be new in this same save.
        foreach (var box in missing) box.Session = session;
        db.Boxes.AddRange(missing);
        logger.LogInformation("Seeded {Count} sample boxes", missing.Count);
    }
}

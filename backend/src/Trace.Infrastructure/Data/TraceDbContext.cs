using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Trace.Core.Entities;

namespace Trace.Infrastructure.Data;

/// <summary>
/// Tables and columns are snake_case (UseSnakeCaseNamingConvention, set where the context is registered).
/// The boxes columns copynumber / packetnumber are named explicitly to mirror the source schema.
/// </summary>
public class TraceDbContext(DbContextOptions<TraceDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<WorkflowStage> WorkflowStages => Set<WorkflowStage>();
    public DbSet<Box> Boxes => Set<Box>();
    public DbSet<ScanRecord> ScanRecords => Set<ScanRecord>();
    public DbSet<Setting> Settings => Set<Setting>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Cnic).HasMaxLength(13).IsFixedLength().IsRequired();
            e.HasIndex(x => x.Cnic).IsUnique();
            e.Property(x => x.Email).HasMaxLength(320).IsRequired();
            e.Property(x => x.PasswordHash).IsRequired();
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(x => x.Status);
            e.Property(x => x.IsAdmin).HasDefaultValue(false);
            e.HasOne(x => x.Role).WithMany().HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Session).WithMany().HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ApprovedBy).WithMany().HasForeignKey(x => x.ApprovedByUserId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Role>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Name).IsUnique();
            e.Property(x => x.SaveStage).HasMaxLength(100);
            e.Property(x => x.VisibleFields)
                .HasColumnType("jsonb")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>(),
                    new ValueComparer<List<string>>(
                        (a, c) => a!.SequenceEqual(c!),
                        v => v.Aggregate(0, (h, s) => HashCode.Combine(h, s.GetHashCode())),
                        v => v.ToList()))
                .IsRequired();
        });

        b.Entity<Session>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Name).IsUnique();
            e.HasMany(x => x.Stages).WithOne(x => x.Session).HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<WorkflowStage>(e =>
        {
            e.Property(x => x.StageName).HasColumnType("text").IsRequired();
            e.HasIndex(x => new { x.SessionId, x.Position }).IsUnique();
            e.HasIndex(x => new { x.SessionId, x.StageName }).IsUnique();
        });

        b.Entity<Box>(e =>
        {
            e.HasOne(x => x.Session).WithMany().HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.CenterName).HasColumnType("text").IsRequired();
            e.Property(x => x.Subject).HasMaxLength(20).IsRequired();
            e.Property(x => x.Version).HasMaxLength(2).IsRequired();
            e.Property(x => x.CopyNumber).HasColumnName("copynumber").HasMaxLength(10).IsRequired();
            e.HasIndex(x => x.CopyNumber).IsUnique();
            e.Property(x => x.PacketNumber).HasColumnName("packetnumber");
        });

        b.Entity<ScanRecord>(e =>
        {
            e.Property(x => x.CopyNumber).HasColumnName("copynumber").HasColumnType("text").IsRequired();
            e.Property(x => x.Stage).HasColumnType("text").IsRequired();
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Role).WithMany().HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Box).WithMany().HasForeignKey(x => x.BoxId).OnDelete(DeleteBehavior.Restrict);
            // A box is recorded once per stage. Also serves box_id lookups (leading column).
            e.HasIndex(x => new { x.BoxId, x.Stage }).IsUnique();
            e.HasIndex(x => x.UserId);
        });

        b.Entity<Setting>(e =>
        {
            e.Property(x => x.Key).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Key).IsUnique();
            e.Property(x => x.Value).IsRequired();
        });
    }
}

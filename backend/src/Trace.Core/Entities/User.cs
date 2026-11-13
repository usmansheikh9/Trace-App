namespace Trace.Core.Entities;

public enum UserStatus
{
    Pending,
    Approved,
    Rejected,
}

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    /// <summary>13 digits, no dashes.</summary>
    public string Cnic { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateOnly DateOfBirth { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    /// <summary>The session this user works in. Null until assigned.</summary>
    public int? SessionId { get; set; }
    public Session? Session { get; set; }
    public int? RoleId { get; set; }
    public Role? Role { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Pending;
    public bool IsAdmin { get; set; }
    public int? ApprovedByUserId { get; set; }
    public User? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

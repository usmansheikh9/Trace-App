using Trace.Core.Common;
using Trace.Core.Entities;

namespace Trace.Core.Dtos;

public record UserProfileDto(string Id, string Name, string Cnic, string Email, DateOnly DateOfBirth)
{
    public static UserProfileDto From(User u) =>
        new(u.Id.ToString(), u.Name, Common.Cnic.Format(u.Cnic), u.Email, u.DateOfBirth);
}

public record MeStatsDto(int ScannedSoFar);

public record MeDto(UserProfileDto User, RoleConfigDto? Role, SessionRefDto? Session, MeStatsDto Stats);

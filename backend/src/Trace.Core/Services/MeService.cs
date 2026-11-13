using Trace.Core.Dtos;
using Trace.Core.Interfaces;

namespace Trace.Core.Services;

public interface IMeService
{
    Task<MeDto> GetAsync(int userId, CancellationToken ct = default);
}

public class MeService(IUserRepository users, IScanRecordRepository scans) : IMeService
{
    public async Task<MeDto> GetAsync(int userId, CancellationToken ct = default)
    {
        var user = await UserAccess.GetApprovedAsync(users, userId, ct);
        var role = UserAccess.ActiveRole(user);
        var session = UserAccess.ActiveSession(user);
        var scanned = await scans.CountByUserAsync(user.Id, ct);

        return new MeDto(
            UserProfileDto.From(user),
            role is null ? null : RoleConfigDto.From(role),
            session is null ? null : SessionRefDto.From(session),
            new MeStatsDto(scanned));
    }
}

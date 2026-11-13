using Trace.Core.Dtos;
using Trace.Core.Entities;
using Trace.Core.Errors;
using Trace.Core.Interfaces;

namespace Trace.Core.Services;

public interface ISettingsService
{
    Task SetMasterPasswordAsync(SetMasterPasswordRequest request, CancellationToken ct = default);
}

public class SettingsService(ISettingRepository settings, IPasswordService passwords) : ISettingsService
{
    public const int MinMasterPasswordLength = 8;

    public async Task SetMasterPasswordAsync(SetMasterPasswordRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(request.Value) || request.Value.Length < MinMasterPasswordLength)
            throw ValidationException.For("value", $"Must be at least {MinMasterPasswordLength} characters");

        await settings.SetValueAsync(Setting.MasterPasswordHashKey, passwords.Hash(request.Value), ct);
        await settings.SaveChangesAsync(ct);
    }
}

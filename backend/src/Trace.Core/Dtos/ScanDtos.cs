using Trace.Core.Entities;

namespace Trace.Core.Dtos;

public record CreateScanRequest(string? CopyNumber);

/// <summary>Keeps the app's SaveScanResponse fields (id as a string, savedAt) and adds the record's detail.</summary>
public record ScanRecordDto(
    string Id,
    string CopyNumber,
    string Stage,
    int RoleId,
    DateTime SavedAt)
{
    public static ScanRecordDto From(ScanRecord s) =>
        new(s.Id.ToString(), s.CopyNumber, s.Stage, s.RoleId, s.CreatedAt);
}

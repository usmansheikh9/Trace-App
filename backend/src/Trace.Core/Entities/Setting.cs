namespace Trace.Core.Entities;

public class Setting
{
    public const string MasterPasswordHashKey = "master_password_hash";

    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

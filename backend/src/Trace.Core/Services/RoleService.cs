using Trace.Core.Common;
using Trace.Core.Dtos;
using Trace.Core.Entities;
using Trace.Core.Errors;
using Trace.Core.Interfaces;

namespace Trace.Core.Services;

public interface IRoleService
{
    Task<IReadOnlyList<RoleDto>> ListAsync(CancellationToken ct = default);
    Task<RoleDto> GetAsync(int id, CancellationToken ct = default);
    Task<RoleDto> CreateAsync(SaveRoleRequest request, CancellationToken ct = default);
    Task<RoleDto> UpdateAsync(int id, SaveRoleRequest request, CancellationToken ct = default);
}

public class RoleService(IRoleRepository roles, IClock clock) : IRoleService
{
    public async Task<IReadOnlyList<RoleDto>> ListAsync(CancellationToken ct = default) =>
        (await roles.ListAsync(ct)).Select(RoleDto.From).ToList();

    public async Task<RoleDto> GetAsync(int id, CancellationToken ct = default) =>
        RoleDto.From(await roles.GetByIdAsync(id, ct) ?? throw new NotFoundException("Role not found"));

    public async Task<RoleDto> CreateAsync(SaveRoleRequest request, CancellationToken ct = default)
    {
        var fields = Validate(request);
        var name = request.Name!.Trim();
        if (await roles.NameExistsAsync(name, null, ct))
            throw new ConflictException($"A role named {name} already exists");

        var now = clock.UtcNow;
        var role = new Role { CreatedAt = now };
        Apply(role, request, name, fields, now);
        roles.Add(role);
        await roles.SaveChangesAsync(ct);
        return RoleDto.From(role);
    }

    public async Task<RoleDto> UpdateAsync(int id, SaveRoleRequest request, CancellationToken ct = default)
    {
        var role = await roles.GetByIdAsync(id, ct) ?? throw new NotFoundException("Role not found");
        var fields = Validate(request);
        var name = request.Name!.Trim();
        if (await roles.NameExistsAsync(name, id, ct))
            throw new ConflictException($"A role named {name} already exists");

        Apply(role, request, name, fields, clock.UtcNow);
        await roles.SaveChangesAsync(ct);
        return RoleDto.From(role);
    }

    private static List<string> Validate(SaveRoleRequest r)
    {
        var v = new Validator();
        v.Require("name", r.Name).MaxLength("name", r.Name, 100);
        v.MaxLength("saveStage", r.SaveStage, 100);
        if (r.CanSave && string.IsNullOrWhiteSpace(r.SaveStage))
            v.Add("saveStage", "Required when canSave is on");

        var fields = (r.VisibleFields ?? []).Select(f => f.Trim()).Distinct().ToList();
        var unknown = fields.Where(f => !BoxFields.All.Contains(f)).ToList();
        if (unknown.Count > 0)
            v.Add("visibleFields", $"Unknown field(s): {string.Join(", ", unknown)}. Allowed: {string.Join(", ", BoxFields.All)}");

        v.ThrowIfAny();
        // Keep the canonical display order regardless of input order.
        return BoxFields.All.Where(fields.Contains).ToList();
    }

    private static void Apply(Role role, SaveRoleRequest r, string name, List<string> fields, DateTime now)
    {
        role.Name = name;
        role.SaveStage = string.IsNullOrWhiteSpace(r.SaveStage) ? null : r.SaveStage.Trim();
        role.CanScan = r.CanScan;
        role.CanFindCopy = r.CanFindCopy;
        role.CanSave = r.CanSave;
        role.CanPrint = r.CanPrint;
        role.VisibleFields = fields;
        role.IsActive = r.IsActive;
        role.UpdatedAt = now;
    }
}

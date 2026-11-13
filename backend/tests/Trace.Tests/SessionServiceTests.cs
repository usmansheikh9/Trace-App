using Trace.Core.Dtos;
using Trace.Core.Entities;
using Trace.Core.Errors;
using Trace.Core.Services;
using Trace.Infrastructure.Repositories;

namespace Trace.Tests;

public class SessionServiceTests
{
    [Fact]
    public async Task Workflow_replace_renumbers_from_one_in_list_order()
    {
        using var h = new TestHarness();
        var s = h.AddSession("A", true, "Received", "Cut", "Packed");

        var wf = await h.SessionService.SaveWorkflowAsync(s.Id, new SaveWorkflowRequest([" Received ", "Packed"]));

        Assert.Equal([("Received", 1), ("Packed", 2)], wf.Stages.Select(x => (x.StageName, x.Position)).ToArray());
        Assert.Equal(2, h.Db.WorkflowStages.Count(x => x.SessionId == s.Id));
    }

    [Theory]
    [InlineData(new string[0], "Add at least one stage")]
    [InlineData(new[] { "Received", " " }, "Stage names can't be blank")]
    [InlineData(new[] { "Received", "received" }, "Stage names must be unique: Received")]
    public async Task Workflow_validation(string[] stages, string message)
    {
        using var h = new TestHarness();
        var s = h.AddSession();

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            h.SessionService.SaveWorkflowAsync(s.Id, new SaveWorkflowRequest(stages.ToList())));

        Assert.Equal(message, ex.Errors["stages"].Single());
    }

    [Fact]
    public async Task Workflow_reports_scan_counts_and_list_reports_user_and_box_counts()
    {
        using var h = new TestHarness();
        var s = h.AddSession("A");
        var other = h.AddSession("B");
        var receiver = h.AddUser("3520212345671", "secret", UserStatus.Approved, h.AddRole("Receiver", stage: "Received"), s);
        h.AddBox("30000001", s);
        h.AddBox("30000002", s);
        h.AddBox("40000001", other);
        await h.ScanService.SaveAsync(receiver.Id, new CreateScanRequest("30000001"));
        await h.ScanService.SaveAsync(receiver.Id, new CreateScanRequest("30000002"));

        var wf = await h.SessionService.GetWorkflowAsync(s.Id);
        var list = await h.SessionService.ListAsync();

        Assert.Equal([2, 0, 0], wf.Stages.Select(x => x.ScanCount).ToArray());
        Assert.Equal([("A", 1, 2), ("B", 0, 1)], list.Select(x => (x.Name, x.UserCount, x.BoxCount)).ToArray());
    }

    [Fact]
    public async Task Session_names_are_unique_case_insensitively()
    {
        using var h = new TestHarness();
        await h.SessionService.CreateAsync(new SaveSessionRequest("Board 2026"));

        await Assert.ThrowsAsync<ConflictException>(() => h.SessionService.CreateAsync(new SaveSessionRequest("board 2026")));
    }

    [Fact]
    public async Task Approve_requires_an_active_role_and_an_active_session()
    {
        using var h = new TestHarness();
        var admin = h.AddUser("1111111111111", "x", UserStatus.Approved);
        var user = h.AddUser("3520212345671", "secret", UserStatus.Pending);
        var role = h.AddRole("Receiver");
        var closed = h.AddSession("Closed", isActive: false);
        var open = h.AddSession("Open");
        var svc = new AdminUserService(h.Users, new RoleRepository(h.Db), h.Sessions, h.Clock);

        var missing = await Assert.ThrowsAsync<ValidationException>(() =>
            svc.ApproveAsync(admin.Id, user.Id, new ApproveUserRequest(role.Id, null)));
        var inactive = await Assert.ThrowsAsync<ValidationException>(() =>
            svc.ApproveAsync(admin.Id, user.Id, new ApproveUserRequest(role.Id, closed.Id)));
        var ok = await svc.ApproveAsync(admin.Id, user.Id, new ApproveUserRequest(role.Id, open.Id));

        Assert.Equal("Required", missing.Errors["sessionId"].Single());
        Assert.Equal("Session is inactive", inactive.Errors["sessionId"].Single());
        Assert.Equal((UserStatus.Approved, "Receiver", "Open"), (ok.Status, ok.Role?.Name, ok.Session?.Name));
    }
}

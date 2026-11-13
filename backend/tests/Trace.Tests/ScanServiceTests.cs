using Trace.Core.Dtos;
using Trace.Core.Entities;
using Trace.Core.Errors;

namespace Trace.Tests;

public class ScanServiceTests
{
    /// <summary>Session A (Received -> Cut -> Packed), three roles, one box, one user per stage.</summary>
    private sealed class Line : IDisposable
    {
        public readonly TestHarness H = new();
        public readonly Session Session;
        public readonly Box Box;
        public readonly User Receiver, Cutter, Packer;

        public Line()
        {
            Session = H.AddSession();
            Box = H.AddBox("30000003", Session);
            Receiver = H.AddUser("3520212345671", "secret", UserStatus.Approved, H.AddRole("Receiver", stage: "Received"), Session, "Rida Receiver");
            Cutter = H.AddUser("3520212345672", "secret", UserStatus.Approved, H.AddRole("Cutter", stage: "Cut"), Session, "Kamran Cutter");
            Packer = H.AddUser("3520212345673", "secret", UserStatus.Approved, H.AddRole("Packer", stage: "Packed"), Session, "Pari Packer");
        }

        public Task<ScanRecordDto> Save(User u, string number = "30000003") =>
            H.ScanService.SaveAsync(u.Id, new CreateScanRequest(number));

        public void Dispose() => H.Dispose();
    }

    [Fact]
    public async Task First_stage_is_free_and_stage_comes_from_the_role()
    {
        using var l = new Line();

        var dto = await l.Save(l.Receiver);

        Assert.Equal("Received", dto.Stage);
        var record = l.H.Db.ScanRecords.Single();
        Assert.Equal(l.Box.Id, record.BoxId);
        Assert.Equal(l.H.Clock.UtcNow, record.CreatedAt);
    }

    [Fact]
    public async Task Later_stage_requires_the_immediately_previous_stage()
    {
        using var l = new Line();

        var cutFirst = await Assert.ThrowsAsync<CodedException>(() => l.Save(l.Cutter));
        Assert.Equal((409, ErrorCodes.OutOfOrder, "Must be Received first."), (cutFirst.Status, cutFirst.Code, cutFirst.Message));

        await l.Save(l.Receiver);
        // No skipping: Packed needs Cut, not just Received.
        var skip = await Assert.ThrowsAsync<CodedException>(() => l.Save(l.Packer));
        Assert.Equal("Must be Cut first.", skip.Message);

        await l.Save(l.Cutter);
        await l.Save(l.Packer);
        Assert.Equal(["Cut", "Packed", "Received"], l.H.Db.ScanRecords.Select(s => s.Stage).OrderBy(s => s).ToArray());
    }

    [Fact]
    public async Task Once_per_stage()
    {
        using var l = new Line();
        await l.Save(l.Receiver);

        var again = await Assert.ThrowsAsync<CodedException>(() => l.Save(l.Receiver));

        Assert.Equal((409, ErrorCodes.AlreadyScanned), (again.Status, again.Code));
        Assert.Equal(1, l.H.Db.ScanRecords.Count());
    }

    [Fact]
    public async Task Box_in_another_session_is_wrong_session_for_save_and_lookup()
    {
        using var l = new Line();
        var other = l.H.AddSession("Session B");
        l.H.AddBox("40000001", other);

        var save = await Assert.ThrowsAsync<CodedException>(() => l.Save(l.Receiver, "40000001"));
        var lookup = await Assert.ThrowsAsync<CodedException>(() => l.H.BoxService.LookupAsync(l.Receiver.Id, "40000001"));

        Assert.Equal((403, ErrorCodes.WrongSession), (save.Status, save.Code));
        Assert.Equal(ErrorCodes.WrongSession, lookup.Code);
        Assert.Empty(l.H.Db.ScanRecords);
    }

    [Fact]
    public async Task User_without_an_active_session_is_no_session()
    {
        using var l = new Line();
        var noSession = l.H.AddUser("3520212345674", "secret", UserStatus.Approved, l.H.AddRole("Loose", stage: "Received"));
        var inactive = l.H.AddSession("Closed", isActive: false);
        var inInactive = l.H.AddUser("3520212345675", "secret", UserStatus.Approved, l.H.AddRole("Closed role", stage: "Received"), inactive);

        foreach (var u in new[] { noSession, inInactive })
        {
            var ex = await Assert.ThrowsAsync<CodedException>(() => l.Save(u));
            Assert.Equal((403, ErrorCodes.NoSession), (ex.Status, ex.Code));
        }
    }

    [Fact]
    public async Task Role_stage_outside_the_workflow_cannot_save()
    {
        using var l = new Line();
        var qa = l.H.AddUser("3520212345674", "secret", UserStatus.Approved, l.H.AddRole("QA", stage: "Audited"), l.Session);

        var ex = await Assert.ThrowsAsync<CodedException>(() => l.Save(qa));

        Assert.Equal((403, ErrorCodes.StageNotInWorkflow), (ex.Status, ex.Code));
        Assert.Contains("Audited", ex.Message);
    }

    [Fact]
    public async Task Stage_names_match_case_insensitively_and_record_the_workflow_spelling()
    {
        using var l = new Line();
        var lower = l.H.AddUser("3520212345674", "secret", UserStatus.Approved, l.H.AddRole("lower", stage: "received"), l.Session);

        var dto = await l.Save(lower);

        Assert.Equal("Received", dto.Stage);
    }

    [Fact]
    public async Task Lookup_returns_per_stage_progress_in_workflow_order()
    {
        using var l = new Line();
        await l.Save(l.Receiver);
        l.H.Clock.UtcNow = l.H.Clock.UtcNow.AddMinutes(5);
        await l.Save(l.Cutter);

        var box = await l.H.BoxService.LookupAsync(l.Packer.Id, "30000003");

        Assert.Equal("30000003", box.CopyNumber);
        Assert.Equal(["Received", "Cut", "Packed"], box.Workflow.Select(s => s.StageName).ToArray());
        Assert.Equal([1, 2, 3], box.Workflow.Select(s => s.Position).ToArray());
        Assert.Equal([true, true, false], box.Workflow.Select(s => s.Done).ToArray());
        Assert.Equal(["Rida Receiver", "Kamran Cutter", null], box.Workflow.Select(s => s.CompletedByName).ToArray());
        Assert.Equal(l.H.Clock.UtcNow, box.Workflow[1].CompletedAt);
        Assert.Null(box.Workflow[2].CompletedAt);
    }

    [Fact]
    public async Task Save_requires_can_save_and_an_existing_box()
    {
        using var l = new Line();
        var viewer = l.H.AddUser("3520212345674", "secret", UserStatus.Approved, l.H.AddRole("Viewer", canSave: false, stage: null), l.Session);

        await Assert.ThrowsAsync<ForbiddenException>(() => l.Save(viewer));
        await Assert.ThrowsAsync<NotFoundException>(() => l.Save(l.Receiver, "99999999"));
    }

    [Fact]
    public async Task Rejected_user_is_coded_before_anything_else()
    {
        using var l = new Line();
        var rejected = l.H.AddUser("3520212345674", "secret", UserStatus.Rejected, l.H.AddRole("R2", stage: "Received"), l.Session);

        var ex = await Assert.ThrowsAsync<CodedException>(() => l.Save(rejected));

        Assert.Equal(ErrorCodes.AccountRejected, ex.Code);
    }
}

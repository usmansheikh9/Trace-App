using Trace.Core.Dtos;
using Trace.Core.Entities;
using Trace.Core.Errors;

namespace Trace.Tests;

public class AuthServiceTests
{
    private static RegisterRequest Register(string cnic = "35202-1234567-1", string? master = null) =>
        new("Ayesha Khan", cnic, "ayesha@example.com", new DateOnly(1996, 3, 14), "secret", master);

    [Fact]
    public async Task Register_with_valid_master_password_is_approved_with_session_and_no_role()
    {
        using var h = new TestHarness();

        var res = await h.Auth.RegisterAsync(Register(master: TestHarness.MasterPassword));

        Assert.Equal("Approved", res.Status);
        Assert.NotNull(res.Session);
        Assert.Null(res.Session!.Role);
        Assert.Equal("35202-1234567-1", res.Session.Cnic);
        Assert.False(string.IsNullOrEmpty(res.Session.Token));
        var stored = h.Db.Users.Single();
        Assert.Equal("3520212345671", stored.Cnic);
        Assert.Equal(UserStatus.Approved, stored.Status);
        Assert.Null(stored.RoleId);
    }

    [Fact]
    public async Task Register_with_wrong_master_password_is_a_field_error_and_creates_nothing()
    {
        using var h = new TestHarness();

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            h.Auth.RegisterAsync(Register(master: "wrong-master")));

        Assert.Equal(["masterPassword"], ex.Errors.Keys.ToArray());
        Assert.Empty(h.Db.Users);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task Register_without_master_password_is_pending(string? master)
    {
        using var h = new TestHarness();

        var res = await h.Auth.RegisterAsync(Register(master: master));

        Assert.Equal("Pending", res.Status);
        Assert.Null(res.Session);
        Assert.Equal(UserStatus.Pending, h.Db.Users.Single().Status);
    }

    [Fact]
    public async Task Register_rejects_duplicate_cnic_regardless_of_dashes()
    {
        using var h = new TestHarness();
        await h.Auth.RegisterAsync(Register("3520212345671"));

        await Assert.ThrowsAsync<ConflictException>(() => h.Auth.RegisterAsync(Register("35202-1234567-1")));
    }

    [Fact]
    public async Task Register_reports_camelCase_field_errors()
    {
        using var h = new TestHarness();

        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            h.Auth.RegisterAsync(new RegisterRequest("", "123", "nope", null, "", null)));

        Assert.Equal(["name", "cnic", "email", "dateOfBirth", "password"], ex.Errors.Keys.ToArray());
    }

    [Theory]
    [InlineData(UserStatus.Pending, ErrorCodes.AccountPending)]
    [InlineData(UserStatus.Rejected, ErrorCodes.AccountRejected)]
    public async Task Login_for_unapproved_account_is_coded_403(UserStatus status, string code)
    {
        using var h = new TestHarness();
        h.AddUser("3520212345671", "secret", status);

        var ex = await Assert.ThrowsAsync<CodedException>(() =>
            h.Auth.LoginAsync(new LoginRequest("35202-1234567-1", "secret")));

        Assert.Equal(403, ex.Status);
        Assert.Equal(code, ex.Code);
    }

    [Fact]
    public async Task Login_with_wrong_password_is_unauthorized()
    {
        using var h = new TestHarness();
        h.AddUser("3520212345671", "secret", UserStatus.Approved);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            h.Auth.LoginAsync(new LoginRequest("35202-1234567-1", "wrong")));
    }

    [Fact]
    public async Task Login_returns_role_config_and_hides_inactive_role()
    {
        using var h = new TestHarness();
        var active = h.AddRole("Receiver");
        var inactive = h.AddRole("Old", isActive: false);
        h.AddUser("3520212345671", "secret", UserStatus.Approved, active);
        h.AddUser("3520212345672", "secret", UserStatus.Approved, inactive);

        var withRole = await h.Auth.LoginAsync(new LoginRequest("35202-1234567-1", "secret"));
        var withInactive = await h.Auth.LoginAsync(new LoginRequest("35202-1234567-2", "secret"));

        Assert.Equal("Receiver", withRole.Role?.Name);
        Assert.Equal("Received", withRole.Role?.SaveStage);
        Assert.Null(withInactive.Role);
    }

    [Fact]
    public async Task Login_returns_the_work_session_and_hides_an_inactive_one()
    {
        using var h = new TestHarness();
        var role = h.AddRole("Receiver");
        h.AddUser("3520212345671", "secret", UserStatus.Approved, role, h.AddSession("Board 2026"));
        h.AddUser("3520212345672", "secret", UserStatus.Approved, role, h.AddSession("Closed", isActive: false));
        h.AddUser("3520212345673", "secret", UserStatus.Approved, role);

        var active = await h.Auth.LoginAsync(new LoginRequest("35202-1234567-1", "secret"));
        var closed = await h.Auth.LoginAsync(new LoginRequest("35202-1234567-2", "secret"));
        var none = await h.Auth.LoginAsync(new LoginRequest("35202-1234567-3", "secret"));

        Assert.Equal("Board 2026", active.Session?.Name);
        Assert.Null(closed.Session);
        Assert.Null(none.Session);
    }
}

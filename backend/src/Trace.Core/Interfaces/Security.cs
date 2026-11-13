using Trace.Core.Entities;

namespace Trace.Core.Interfaces;

public interface IPasswordService
{
    string Hash(string password);
    bool Verify(string hash, string password);
}

public record IssuedToken(string Token, DateTime ExpiresAt);

public interface ITokenService
{
    IssuedToken Issue(User user);
}

public interface IClock
{
    DateTime UtcNow { get; }
}

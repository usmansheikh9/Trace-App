namespace Trace.Core.Errors;

/// <summary>
/// Domain errors thrown by services and mapped to HTTP by the API layer:
/// a plain-string body for status errors, a ValidationProblem for field errors,
/// and a problem whose Title is a machine code for coded failures.
/// </summary>
public abstract class AppException(string message) : Exception(message);

public sealed class UnauthorizedException(string message) : AppException(message);

public sealed class ForbiddenException(string message) : AppException(message);

public sealed class NotFoundException(string message) : AppException(message);

public sealed class ConflictException(string message) : AppException(message);

/// <summary>Field errors keyed by camelCase field name.</summary>
public sealed class ValidationException(IDictionary<string, string[]> errors)
    : AppException("One or more validation errors occurred.")
{
    public IDictionary<string, string[]> Errors { get; } = errors;

    public static ValidationException For(string field, string message) =>
        new(new Dictionary<string, string[]> { [field] = [message] });
}

/// <summary>A failure the client branches on by <see cref="Code"/>, e.g. account_pending.</summary>
public sealed class CodedException(int status, string code, string message) : AppException(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}

public static class ErrorCodes
{
    public const string AccountPending = "account_pending";
    public const string AccountRejected = "account_rejected";
    public const string AlreadyScanned = "already_scanned";
    /// <summary>403: the caller has no (active) work session.</summary>
    public const string NoSession = "no_session";
    /// <summary>403: the box belongs to a different session than the caller's.</summary>
    public const string WrongSession = "wrong_session";
    /// <summary>403: the caller's save stage isn't a step of the box's session workflow.</summary>
    public const string StageNotInWorkflow = "stage_not_in_workflow";
    /// <summary>409: the previous workflow stage hasn't been recorded for this box yet.</summary>
    public const string OutOfOrder = "out_of_order";
}

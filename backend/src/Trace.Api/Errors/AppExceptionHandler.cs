using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Trace.Core.Errors;

namespace Trace.Api.Errors;

/// <summary>
/// Maps service exceptions to the shapes the app's http client parses:
/// - ValidationException  -> 400 ValidationProblem, errors.&lt;camelField&gt;[0]
/// - CodedException       -> problem with Title = machine code, message in errors.code[0]
/// - status errors        -> plain-string body with 401 / 403 / 404 / 409
/// </summary>
public class AppExceptionHandler(IProblemDetailsService problems) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception exception, CancellationToken ct)
    {
        switch (exception)
        {
            case ValidationException v:
                http.Response.StatusCode = StatusCodes.Status400BadRequest;
                return await problems.TryWriteAsync(new ProblemDetailsContext
                {
                    HttpContext = http,
                    ProblemDetails = new ValidationProblemDetails(v.Errors)
                    {
                        Status = StatusCodes.Status400BadRequest,
                    },
                });

            case CodedException c:
                http.Response.StatusCode = c.Status;
                return await problems.TryWriteAsync(new ProblemDetailsContext
                {
                    HttpContext = http,
                    ProblemDetails = new ValidationProblemDetails(new Dictionary<string, string[]>
                    {
                        ["code"] = [c.Message],
                    })
                    {
                        Title = c.Code,
                        Status = c.Status,
                    },
                });

            case UnauthorizedException:
                await WriteText(http, StatusCodes.Status401Unauthorized, exception.Message, ct);
                return true;
            case ForbiddenException:
                await WriteText(http, StatusCodes.Status403Forbidden, exception.Message, ct);
                return true;
            case NotFoundException:
                await WriteText(http, StatusCodes.Status404NotFound, exception.Message, ct);
                return true;
            case ConflictException:
                await WriteText(http, StatusCodes.Status409Conflict, exception.Message, ct);
                return true;

            default:
                return false;
        }
    }

    public static Task WriteText(HttpContext http, int status, string message, CancellationToken ct = default)
    {
        http.Response.StatusCode = status;
        http.Response.ContentType = "text/plain; charset=utf-8";
        return http.Response.WriteAsync(message, ct);
    }
}

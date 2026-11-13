using Microsoft.AspNetCore.Mvc;

namespace Trace.Api.Errors;

/// <summary>
/// Model-binding failures (malformed JSON, a bad date) as a ValidationProblem keyed
/// by camelCase field, so "$.dateOfBirth" arrives as "dateOfBirth".
/// </summary>
public static class ModelStateResponse
{
    public static IActionResult Create(ActionContext context)
    {
        var errors = new Dictionary<string, string[]>();
        foreach (var (key, entry) in context.ModelState)
        {
            if (entry.Errors.Count == 0) continue;
            var field = NormalizeKey(key);
            // JSON conversion messages leak type names and byte positions; keep them generic.
            string[] messages = field == "body" ? ["Invalid request body"]
                : key.StartsWith('$') ? ["Invalid value"]
                : entry.Errors.Select(e => string.IsNullOrEmpty(e.ErrorMessage) ? "Invalid value" : e.ErrorMessage).ToArray();
            errors[field] = errors.TryGetValue(field, out var existing) ? [.. existing.Union(messages)] : messages;
        }

        // A bad value also fails the whole body; report only the specific field when there is one.
        if (errors.Count > 1) errors.Remove("body");

        return new BadRequestObjectResult(new ValidationProblemDetails(errors)
        {
            Status = StatusCodes.Status400BadRequest,
        });
    }

    private static string NormalizeKey(string key)
    {
        if (key.StartsWith("$.")) key = key[2..];
        // An unreadable body binds to the action parameter itself ("request", "$").
        if (key is "" or "$" or "request") return "body";
        return char.ToLowerInvariant(key[0]) + key[1..];
    }
}

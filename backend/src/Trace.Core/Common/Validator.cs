using Trace.Core.Errors;

namespace Trace.Core.Common;

/// <summary>Collects field errors and throws them as one ValidationException.</summary>
public sealed class Validator
{
    private readonly Dictionary<string, List<string>> _errors = new();

    public Validator Add(string field, string message)
    {
        if (!_errors.TryGetValue(field, out var list)) _errors[field] = list = [];
        list.Add(message);
        return this;
    }

    public Validator Require(string field, string? value, string message = "Required")
    {
        if (string.IsNullOrWhiteSpace(value)) Add(field, message);
        return this;
    }

    public Validator MaxLength(string field, string? value, int max)
    {
        if (value is not null && value.Trim().Length > max) Add(field, $"Must be at most {max} characters");
        return this;
    }

    public bool Has(string field) => _errors.ContainsKey(field);

    public void ThrowIfAny()
    {
        if (_errors.Count > 0)
            throw new ValidationException(_errors.ToDictionary(e => e.Key, e => e.Value.ToArray()));
    }
}

using System.Text.RegularExpressions;

namespace Trace.Core.Common;

public static partial class Cnic
{
    /// <summary>
    /// Accepts "00000-0000000-0" or 13 bare digits and returns the 13 digits,
    /// or null when the input is not a valid CNIC.
    /// </summary>
    public static string? Normalize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        var trimmed = input.Trim();
        if (!Dashed().IsMatch(trimmed) && !Bare().IsMatch(trimmed)) return null;
        return trimmed.Replace("-", string.Empty);
    }

    /// <summary>13 digits -> "00000-0000000-0", the shape the app displays.</summary>
    public static string Format(string digits) =>
        digits.Length == 13 ? $"{digits[..5]}-{digits[5..12]}-{digits[12]}" : digits;

    [GeneratedRegex(@"^\d{5}-\d{7}-\d$")]
    private static partial Regex Dashed();

    [GeneratedRegex(@"^\d{13}$")]
    private static partial Regex Bare();
}

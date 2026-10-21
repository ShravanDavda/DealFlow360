/**
 * Centralized currency formatter for DealFlow360.
 * Standardizes all displayed monetary values to use $ exclusively with
 * comma grouping and 2 decimal places (e.g. $1,322.99).
 *
 * Rules:
 * - Uses '$' prefix.
 * - Comma-separated thousands, exactly 2 decimal places.
 * - Handles numbers (1322.99 -> "$1,322.99") and integers (92 -> "$92.00").
 * - Handles PostgreSQL numeric strings ("1322.99" -> "$1,322.99").
 * - Cleans strings containing existing currency symbols or suffixes (e.g. "$1322.99 INR" -> "$1,322.99").
 * - Avoids double formatting (e.g. "$1,322.99" -> "$1,322.99").
 * - Handles null, undefined, empty strings, and NaN safely by returning a fallback (default '--'),
 *   avoiding accidental fabrication of "$0.00" for missing data.
 * - Preserves zero as a valid amount (0 -> "$0.00").
 */
export const formatCurrency = (value, fallback = '--') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  // If already correctly formatted like "$1,322.99" or "-$1,322.99", avoid double-formatting
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^[+-]?\$[\d,]+\.\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    // Strip out stray currency labels like 'INR', 'USD', '₹', etc.
    const sanitized = trimmed
      .replace(/INR|USD|EUR|GBP|₹|\$/gi, '')
      .replace(/,/g, '')
      .trim();

    if (sanitized === '' || isNaN(Number(sanitized))) {
      return fallback;
    }

    const num = Number(sanitized);
    const sign = num < 0 ? '-' : '';
    const absVal = Math.abs(num);
    return `${sign}$${absVal.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return fallback;
  }

  const sign = num < 0 ? '-' : '';
  const absVal = Math.abs(num);
  return `${sign}$${absVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default formatCurrency;

/**
 * Centralized Currency Formatter for DealFlow360
 * Standardizes all monetary values to $ with comma grouping and exactly 2 decimal places.
 * Example: 1322.99 -> "$1,322.99"
 * Handles numbers, PostgreSQL numeric strings, strips legacy INR/USD/₹ artifacts,
 * and handles null/undefined/invalid safely without fabricating zeros.
 */
export const formatCurrency = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  let prefix = '';
  let num;

  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '—' || trimmed === '--' || trimmed === '-' || /^(n\/?a|null|undefined)$/i.test(trimmed)) {
      return fallback;
    }

    // Support label prefixes such as "Total: ", "Amount: ", etc.
    const prefixMatch = trimmed.match(/^([a-zA-Z\s]+:\s*)(.*)$/);
    if (prefixMatch) {
      prefix = prefixMatch[1];
    }
    const toProcess = prefixMatch ? prefixMatch[2] : trimmed;

    const cleanStr = toProcess
      .replace(/\b(INR|USD|EUR|GBP|AUD|CAD)\b/gi, '')
      .replace(/[₹$€£,]/g, '')
      .trim();

    if (!cleanStr) {
      return fallback;
    }
    num = Number(cleanStr);
  } else {
    num = Number(value);
  }

  if (isNaN(num) || !isFinite(num)) {
    return fallback;
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = `$${absNum.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const result = isNegative ? `-${formatted}` : formatted;
  return prefix ? `${prefix}${result}` : result;
};

export default formatCurrency;

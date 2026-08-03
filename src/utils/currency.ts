/**
 * Converts Euro amount string or number to integer cents.
 * e.g., 1250.50 -> 125050
 * e.g., "1250.5" -> 125050
 */
export function eurosToCents(amountInEuros: number | string): number {
  if (typeof amountInEuros === 'string') {
    const parsed = parseFloat(amountInEuros.replace(',', '.'));
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  if (isNaN(amountInEuros)) return 0;
  return Math.round(amountInEuros * 100);
}

/**
 * Converts integer cents to Euro number.
 * e.g., 125050 -> 1250.5
 */
export function centsToEuros(cents: number | null | undefined): number {
  if (cents == null || isNaN(cents)) return 0;
  return cents / 100;
}

/**
 * Formats integer cents as currency string e.g. €1,250.50
 */
export function formatCents(cents: number | null | undefined, locale = 'en-MT', currency = 'EUR'): string {
  if (cents == null || isNaN(cents)) {
    return '—';
  }
  const euros = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(euros);
}

/**
 * Formats integer cents without currency symbol e.g. 1,250.50
 */
export function formatCentsNumber(cents: number | null | undefined): string {
  if (cents == null || isNaN(cents)) return '0.00';
  const euros = cents / 100;
  return new Intl.NumberFormat('en-MT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(euros);
}

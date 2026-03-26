/**
 * Bhutan phone number format: +975 + 8 digits
 * Display: +975 XX XX XX XX (e.g. +975 17 12 34 56)
 */

export function formatBhutanPhone(value) {
  if (!value || typeof value !== 'string') return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';

  let num = digits;
  if (num.startsWith('975')) num = num.slice(3);
  if (num.length === 0) return '';

  // Take first 8 digits after country code
  const d = num.slice(0, 8);
  if (d.length >= 8) {
    return `+975 ${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)}`;
  }

  if (d.length > 0) {
    return `+975 ${d}`;
  }

  return value.trim();
}

/**
 * Normalize phone to digits only (for storage/comparison)
 */
export function normalizeBhutanPhone(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
}

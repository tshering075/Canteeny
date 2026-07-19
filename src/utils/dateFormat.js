/**
 * Format a date for display as dd/mm/yyyy.
 * Accepts ISO date strings (YYYY-MM-DD), Date objects, or timestamps.
 */
export function formatDisplayDate(value) {
  if (value == null || value === '') return '—';

  let year;
  let month;
  let day;

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    year = value.slice(0, 4);
    month = value.slice(5, 7);
    day = value.slice(8, 10);
  } else {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    year = String(d.getFullYear());
    month = String(d.getMonth() + 1).padStart(2, '0');
    day = String(d.getDate()).padStart(2, '0');
  }

  return `${day}/${month}/${year}`;
}

/** Format a list of dates as "dd/mm/yy, dd/mm/yy". */
export function formatDisplayDates(values) {
  if (!values?.length) return '—';
  return values.map(formatDisplayDate).join(', ');
}

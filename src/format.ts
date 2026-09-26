export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CURRENCIES = ['₹', '$', '€', '£'] as const;
export type Currency = (typeof CURRENCIES)[number];

export function formatMoney(cents: number, currency: Currency): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fraction = (abs % 100).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${currency}${whole}.${fraction}`;
}

/** Parses user-typed text like "1,250.5" into cents; returns null if invalid or not positive. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/,/g, '').trim();
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned) && !/^\.\d{1,2}$/.test(cleaned)) return null;
  const cents = Math.round(parseFloat(cleaned) * 100);
  return cents > 0 ? cents : null;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

/** "2026-09" style key used to group expenses by month. */
export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function monthLabel(year: number, monthIndex: number): string {
  return `${MONTHS[monthIndex]} ${year}`;
}

export function friendlyDate(iso: string): string {
  if (iso === daysAgo(0)) return 'Today';
  if (iso === daysAgo(1)) return 'Yesterday';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function monthShort(monthIndex: number): string {
  return MONTHS[monthIndex].slice(0, 3);
}

/** Local-midnight Date for a YYYY-MM-DD string. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Weeks start on Monday. */
export function startOfWeek(d: Date): Date {
  const mondayOffset = (d.getDay() + 6) % 7;
  return addDays(startOfDay(d), -mondayOffset);
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** "26 Sep" */
export function shortDate(d: Date): string {
  return `${d.getDate()} ${monthShort(d.getMonth())}`;
}

/** "Friday, 26 Sep 2026" */
export function longDate(iso: string): string {
  const d = parseISODate(iso);
  return `${WEEKDAYS[weekdayIndex(d)]}, ${shortDate(d)} ${d.getFullYear()}`;
}

/** Compact money for tight spaces, e.g. ₹950, ₹1.2k, ₹3.4M. */
export function formatMoneyCompact(cents: number, currency: Currency): string {
  const v = cents / 100;
  if (v >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 1_000) return `${currency}${(v / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${currency}${Math.round(v)}`;
}

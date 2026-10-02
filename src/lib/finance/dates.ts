/** Calendar helpers. All dates are local-time strings: YYYY-MM-DD or YYYY-MM. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addMonthsToKey(monthKey: string, months: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

/** Adds months to a date, clamping to the last day of the target month (Jan 31 + 1 → Feb 28). */
export function addMonthsToDate(iso: string, months: number): string {
  const d = parseISODate(iso);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toISODate(target);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const ms = parseISODate(toIso).getTime() - parseISODate(fromIso).getTime();
  return Math.round(ms / 86_400_000);
}

/** The due date for a month key on a given day, clamped to month length. */
export function dateInMonth(monthKey: string, day: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${monthKey}-${pad(Math.min(day, lastDay))}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonthKey(monthKey: string, opts: { short?: boolean } = {}): string {
  const [y, m] = monthKey.split('-').map(Number);
  return opts.short ? `${MONTHS[m - 1]} ’${String(y).slice(2)}` : `${MONTHS[m - 1]} ${y}`;
}

export function formatDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatRelativeDays(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${-days} days overdue`;
  return `In ${days} days`;
}

/* Shared formatters. The phone app uses USD + Pacific time throughout,
 * so the desktop matches both. Pull all date formatting through these
 * helpers so a future locale switch is a one-file change. */

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdNoCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function money(n: number | string | null | undefined, opts: { cents?: boolean } = {}): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (v == null || Number.isNaN(v)) return '—';
  return opts.cents === false ? usdNoCents.format(v) : usd.format(v);
}

export function num(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return Number.isFinite(v) ? v : 0;
}

const monthLong = new Intl.DateTimeFormat('en-US', {
  month: 'long', year: 'numeric', timeZone: 'America/Los_Angeles',
});

const dayShort = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles',
});

const weekdayShort = new Intl.DateTimeFormat('en-US', {
  weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles',
});

export function fmtMonth(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return monthLong.format(date);
}

export function fmtDayShort(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return dayShort.format(date);
}

export function fmtWeekday(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return weekdayShort.format(date);
}

/** Clamp a percent value into [0, 100] and round to one decimal. Used by
 *  budget / goal / debt progress bars. */
export function pct(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}

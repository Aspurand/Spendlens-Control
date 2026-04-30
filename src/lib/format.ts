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

export function money(n: number | string | null | undefined, opts: { cents?: boolean; sign?: boolean } = {}): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (v == null || Number.isNaN(v)) return '—';
  const fmt = opts.cents === false ? usdNoCents : usd;
  const out = fmt.format(Math.abs(v));
  if (v < 0) return '−' + out;
  return opts.sign && v > 0 ? '+' + out : out;
}

/** Split a money value into sign + dollars + cents so a Stat can render
 *  cents at a smaller weight (matches the design's editorial treatment). */
export function splitMoney(n: number | string | null | undefined): { sign: string; dollars: string; cents: string } {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (v == null || Number.isNaN(v)) return { sign: '', dollars: '$—', cents: '' };
  const abs = Math.abs(v);
  const dollars = '$' + Math.floor(abs).toLocaleString('en-US');
  const cents = (abs - Math.floor(abs)).toFixed(2).slice(1); // ".42"
  return { sign: v < 0 ? '−' : '', dollars, cents };
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

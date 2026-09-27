/**
 * Every time decision in the app, in one place.
 *
 * A Show happens at a wall-clock time in Brazil, not at an instant chosen by whatever machine
 * happens to render the page: Vercel runs in UTC, and a musician on tour carries their own
 * timezone. So the rule is: the database stores instants (timestamptz), and every conversion
 * between an instant and a human-readable date/time goes through `TZ` — never through the
 * ambient timezone of the browser or the server.
 *
 * Client-safe: no server imports, no `next/*`, pure functions only.
 */

export const TZ = 'America/Sao_Paulo';

/** Brazil abolished DST in 2019, so the offset is constant and safe to hard-code. */
const TZ_OFFSET = '-03:00';

/** How long a Show lasts when nobody filled in `end_time`. */
export const DEFAULT_SHOW_MS = 3 * 60 * 60 * 1000;

/** Default gap between a Show's start and its suggested end, used to pre-fill the form. */
export const SUGGESTED_SHOW_MS = 2 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

const asDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

// ─── Reading an instant as Brazilian wall-clock time ─────────────────────────

export type WallClock = { year: number; month: number; day: number; hour: number; minute: number };

/** The date and time an instant shows on a clock in Brasília, whatever the host timezone is. */
export function wallClock(value: Date | string = new Date()): WallClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(asDate(value));

  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // `hour12: false` renders midnight as 24 in some ICU versions.
  const hour = get('hour') % 24;
  return { year: get('year'), month: get('month'), day: get('day'), hour, minute: get('minute') };
}

/** Year, month (1-12) and day as seen in Brasília. */
export function ymd(value: Date | string = new Date()): [number, number, number] {
  const w = wallClock(value);
  return [w.year, w.month, w.day];
}

/** `YYYY-MM-DD` as seen in Brasília — the key to compare or group days by. */
export function dayKey(value: Date | string = new Date()): string {
  const [y, m, d] = ymd(value);
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** `YYYY-MM` as seen in Brasília — the key to group months by. */
export function monthKey(value: Date | string = new Date()): string {
  const [y, m] = ymd(value);
  return `${y}-${pad(m)}`;
}

// ─── Building an instant from Brazilian wall-clock time ─────────────────────

/** The instant a wall-clock time in Brazil corresponds to. Month is 1-12. */
export function toInstant(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00${TZ_OFFSET}`);
}

/** ISO string (UTC) for a wall-clock time in Brazil — what a form should submit. */
export function toIso(year: number, month: number, day: number, hour = 0, minute = 0): string {
  return toInstant(year, month, day, hour, minute).toISOString();
}

/** 00:00 in Brasília, of the day the given instant falls on. */
export function startOfDay(value: Date | string = new Date()): Date {
  const [y, m, d] = ymd(value);
  return toInstant(y, m, d, 0, 0);
}

/** 23:59:59.999 in Brasília, of the day the given instant falls on. */
export function endOfDay(value: Date | string = new Date()): Date {
  return new Date(startOfDay(value).getTime() + 86_400_000 - 1);
}

/** 00:00 of today in Brasília. The single answer to "is this Show in the past?". */
export function startOfToday(): Date {
  return startOfDay(new Date());
}

/** 00:00 in Brasília of a `YYYY-MM-DD` string (the shape date inputs submit). */
export function startOfDayKey(key: string): Date {
  const [y, m, d] = key.slice(0, 10).split('-').map(Number);
  return toInstant(y, m, d, 0, 0);
}

/** 23:59:59.999 in Brasília of a `YYYY-MM-DD` string. */
export function endOfDayKey(key: string): Date {
  return new Date(startOfDayKey(key).getTime() + 86_400_000 - 1);
}

// ─── Recurrence ─────────────────────────────────────────────────────────────

export type Cadence = 'weekly' | 'biweekly' | 'monthly';

/**
 * The next occurrence of a recurring Show, advanced on the Brazilian calendar rather than on the
 * host's. Monthly keeps the day of the month, clamping instead of overflowing: a Show on the 31st
 * recurs on the 28th/30th in shorter months, never on the 1st of the month after.
 */
export function advance(value: Date | string, cadence: Cadence): Date {
  const w = wallClock(value);

  if (cadence === 'monthly') {
    const month = w.month === 12 ? 1 : w.month + 1;
    const year = w.month === 12 ? w.year + 1 : w.year;
    const day = Math.min(w.day, daysInMonth(year, month));
    return toInstant(year, month, day, w.hour, w.minute);
  }

  const days = cadence === 'weekly' ? 7 : 14;
  // Re-read the wall clock after the jump so the time of day survives any calendar oddity.
  const jumped = wallClock(new Date(toInstant(w.year, w.month, w.day, 12, 0).getTime() + days * 86_400_000));
  return toInstant(jumped.year, jumped.month, jumped.day, w.hour, w.minute);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// ─── Show duration ──────────────────────────────────────────────────────────

/** When a Show ends: its own `end_time`, or `DEFAULT_SHOW_MS` after it starts. */
export function showEnd(startIso: string, endIso: string | null): Date {
  return endIso ? new Date(endIso) : new Date(new Date(startIso).getTime() + DEFAULT_SHOW_MS);
}

/** The end time to pre-fill a form with, as the `datetime-local` string inputs expect. */
export function suggestedEndLocalValue(startIso: string): string {
  const w = wallClock(new Date(new Date(startIso).getTime() + SUGGESTED_SHOW_MS));
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}

/** An instant as the `datetime-local` string inputs expect, in Brazilian wall-clock time. */
export function toLocalInputValue(value: Date | string): string {
  const w = wallClock(value);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}

// ─── Formatting ─────────────────────────────────────────────────────────────

const fmt = (value: Date | string, options: Intl.DateTimeFormatOptions) =>
  asDate(value).toLocaleDateString('pt-BR', { timeZone: TZ, ...options });

/** `26/09/26` */
export const fmtShortDate = (value: Date | string) => fmt(value, { day: '2-digit', month: '2-digit', year: '2-digit' });

/** `26/09/2026` */
export const fmtDate = (value: Date | string) => fmt(value, { day: '2-digit', month: '2-digit', year: 'numeric' });

/** `26 de set` */
export const fmtDayMonth = (value: Date | string) => fmt(value, { day: '2-digit', month: 'short' });

/** `26 de setembro de 2026` */
export const fmtLongDate = (value: Date | string) => fmt(value, { day: '2-digit', month: 'long', year: 'numeric' });

/** `sábado, 26 de setembro de 2026` */
export const fmtFullDate = (value: Date | string) =>
  fmt(value, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

/** `sábado` */
export const fmtWeekday = (value: Date | string) => fmt(value, { weekday: 'long' });

/** `SÁB` — the compact weekday the agenda cards show. */
export const fmtWeekdayShort = (value: Date | string) =>
  fmt(value, { weekday: 'short' }).replace('.', '').toUpperCase();

/** `26` — day of the month only. */
export const fmtDayOfMonth = (value: Date | string) => fmt(value, { day: '2-digit' });

/** `Setembro de 2026`, capitalised — the agenda's month headings. */
export function fmtMonthYear(value: Date | string): string {
  const label = fmt(value, { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** `sáb., 26 de set.` — the stamp in a push reminder. */
export const fmtWeekdayDayMonth = (value: Date | string) =>
  fmt(value, { weekday: 'short', day: '2-digit', month: 'short' });

/** `SÁB, 26 DE SET, 20:30` — the compact stamp on the Dashboard's next-Show card. */
export const fmtShortDateTime = (value: Date | string) =>
  fmt(value, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase();

/** `20:30` */
export const fmtTime = (value: Date | string) =>
  asDate(value).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

/** `2h30m de show` — empty when the end is missing or not after the start. */
export function fmtDuration(startIso: string, endIso: string | null, suffix = ' de show'): string {
  if (!endIso) return '';
  const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (diffMs <= 0) return '';
  const totalMins = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0 && m > 0) return `${h}h${m}m${suffix}`;
  if (h > 0) return `${h}h${suffix}`;
  return `${m}m${suffix}`;
}

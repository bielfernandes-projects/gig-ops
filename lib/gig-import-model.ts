// Pure part of the gig-list import (types, cleaning of the IA output, date/time to instant). No server code in here,
// so the import screen in the browser can use it too.
import { toIso } from '@/lib/time';

/** One gig as read from the document. Every field but `title` may be absent: the IA never guesses. */
export type ImportedGig = {
  title: string;
  /** `YYYY-MM-DD` */
  date: string | null;
  /** `HH:MM`, 24h */
  time: string | null;
  /** End `HH:MM`, 24h, when the list gives one (a range like "20h às 23h"). */
  endTime: string | null;
  /** Gross fee in reais. */
  fee: number | null;
  /** Band/project the gig was booked through, when the list says it ("Cala Playa(Brown)" -> "Brown"). */
  project: string | null;
  location: string | null;
  notes: string | null;
};

export type GigImportResult = { gigs: ImportedGig[] };

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

function cleanDate(v: unknown): string | null {
  const m = typeof v === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim()) : null;
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const real = new Date(Date.UTC(y, mo - 1, d));
  return real.getUTCFullYear() === y && real.getUTCMonth() === mo - 1 && real.getUTCDate() === d ? m[0] : null;
}

function cleanTime(v: unknown): string | null {
  const m = typeof v === 'string' ? /^(\d{1,2}):(\d{2})$/.exec(v.trim()) : null;
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/**
 * Fee in reais. The schema asks the IA for a number, but it often answers the text of the cell instead ("R$ 1.200,00",
 * "Cachê: 450", "1,5k") — dropping those as "not a number" was losing the cachê of whole lists, so they are read here.
 * Brazilian notation: the dot groups thousands and the comma separates cents.
 */
export function cleanFee(v: unknown): number | null {
  const round = (n: number) => (Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null);
  if (typeof v === 'number') return round(v);
  if (typeof v !== 'string') return null;

  const raw = v.replace(/\s| /g, '');
  if (/-\d/.test(raw)) return null; // a negative cachê is a reading mistake, not a value
  let s = raw.replace(/^[^\d]+/, ''); // drops the label and the currency ("Cachê:R$")
  const k = /^(\d[\d.,]*)k$/i.exec(s);
  if (k) s = k[1];
  if (!/^\d[\d.,]*$/.test(s)) return null;

  const dot = s.includes('.');
  const comma = s.includes(',');
  let norm = s;
  if (dot && comma) norm = s.replace(/\./g, '').replace(',', '.');
  else if (comma) norm = /^\d+,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  else if (dot) norm = /^\d+\.\d{1,2}$/.test(s) ? s : s.replace(/\./g, '');
  const n = Number(norm);
  return Number.isNaN(n) ? null : round(k ? n * 1000 : n);
}

/** Turns whatever the IA answered into clean gigs; anything unreadable becomes null (and shows up as "falta" on screen). */
export function cleanGigImport(raw: unknown): GigImportResult {
  const list = (raw as { gigs?: unknown })?.gigs;
  const gigs: ImportedGig[] = [];
  for (const g of Array.isArray(list) ? list : []) {
    const o = (g ?? {}) as Record<string, unknown>;
    const title = str(o.title, 120);
    const date = cleanDate(o.date);
    if (!title && !date) continue;
    gigs.push({
      title: title ?? '',
      date,
      time: cleanTime(o.time),
      endTime: cleanTime(o.endTime),
      fee: cleanFee(o.fee),
      project: str(o.project, 80),
      location: str(o.location, 200),
      notes: str(o.notes, 500),
    });
  }
  return { gigs };
}

/** What a row still needs before it can become a gig. */
export const missingGigFields = (g: { title: string; date: string | null; time: string | null }) =>
  [!g.title.trim() && 'title', !g.date && 'date', !g.time && 'time'].filter(Boolean) as ('title' | 'date' | 'time')[];

/** End instant of a gig: the end time on the same day, or on the next day when it is not after the start ("22:00" to "01:00"). */
export function endInstant(date: string, time: string, endTime: string): string {
  const start = Date.parse(gigInstant(date, time));
  const end = Date.parse(gigInstant(date, endTime));
  return new Date(end > start ? end : end + 86_400_000).toISOString();
}

/** ISO instant (UTC) of a Brasília date + time. */
export function gigInstant(date: string, time: string): string {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return toIso(y, mo, d, h, mi);
}

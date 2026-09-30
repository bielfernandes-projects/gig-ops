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
      fee: typeof o.fee === 'number' && Number.isFinite(o.fee) && o.fee >= 0 ? Math.round(o.fee * 100) / 100 : null,
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

/** ISO instant (UTC) of a Brasília date + time. */
export function gigInstant(date: string, time: string): string {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return toIso(y, mo, d, h, mi);
}

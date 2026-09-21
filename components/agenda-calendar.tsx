import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { GigWithProject } from '@/lib/types';

const TZ = 'America/Sao_Paulo';
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MAX_PER_DAY = 3;

const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const pad = (n: number) => String(n).padStart(2, '0');

type Props = {
  gigs: GigWithProject[];
  year: number;
  month: number; // 1-12
  /** Builds the link for another month (keeps the other filters). */
  monthHref: (year: number, month: number) => string;
};

/** Month grid: one cell per day, each show as a line that opens the gig. Days are Brasília days. */
export function AgendaCalendar({ gigs, year, month, monthHref }: Props) {
  const byDay = new Map<string, GigWithProject[]>();
  for (const g of gigs) {
    const key = ymd(new Date(g.start_time));
    byDay.set(key, [...(byDay.get(key) ?? []), g]);
  }

  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = ymd(new Date());
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const [ty, tm] = today.split('-').map(Number);

  const total = Array.from(byDay.entries())
    .filter(([k]) => k.startsWith(`${year}-${pad(month)}`))
    .reduce((s, [, v]) => s + v.length, 0);

  return (
    <section aria-label="Calendário de shows" className="pb-32">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link href={monthHref(prev.y, prev.m)} aria-label="Mês anterior" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h2 className="min-w-[10rem] text-center text-lg font-bold text-zinc-100">
            {MONTHS[month - 1]} {year}
          </h2>
          <Link href={monthHref(next.y, next.m)} aria-label="Próximo mês" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>
            {total} {total === 1 ? 'show' : 'shows'}
          </span>
          {(ty !== year || tm !== month) && (
            <Link href={monthHref(ty, tm)} className="font-semibold text-zinc-300 underline underline-offset-4 hover:text-white">
              Hoje
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-zinc-900 py-2 text-center text-[11px] font-semibold text-zinc-500">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="min-h-[4.5rem] bg-zinc-950/60 md:min-h-[6.5rem]" />;
          const key = `${year}-${pad(month)}-${pad(day)}`;
          const list = byDay.get(key) ?? [];
          const isToday = key === today;
          return (
            <div key={key} className="min-h-[4.5rem] bg-zinc-950 p-1 md:min-h-[6.5rem] md:p-1.5">
              <span
                className={`mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${
                  isToday ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-500'
                }`}
              >
                {day}
              </span>
              <div className="flex flex-col gap-0.5">
                {list.slice(0, MAX_PER_DAY).map((g) => {
                  const color = g.go_projects?.color_hex || '#71717a';
                  const past = new Date(g.start_time).getTime() < Date.now();
                  return (
                    <Link
                      key={g.id}
                      href={`/gigs/${g.id}`}
                      title={`${hhmm(g.start_time)} ${g.title}`}
                      className={`block truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight hover:brightness-125 md:text-xs ${past ? 'opacity-60' : ''}`}
                      style={{ backgroundColor: `${color}33`, color, borderLeft: `2px solid ${color}` }}
                    >
                      <span className="hidden md:inline">{hhmm(g.start_time)} </span>
                      {g.title}
                    </Link>
                  );
                })}
                {list.length > MAX_PER_DAY && <span className="px-1 text-[10px] font-medium text-zinc-500">+{list.length - MAX_PER_DAY}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

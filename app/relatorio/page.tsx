import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserInfo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { brl, gigFinance, splitProfit } from '@/lib/finance';

export const revalidate = 0;

const TZ = 'America/Sao_Paulo';
const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const monthKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).format(d).slice(0, 7);
// 00:00 of a month in Brasília (UTC-3, no DST since 2019)
const monthStart = (y: number, m: number) => new Date(Date.UTC(y, m - 1, 1, 3, 0, 0, 0));

function parseMonth(raw: string | undefined): { y: number; m: number } {
  if (raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return { y: Number(raw.slice(0, 4)), m: Number(raw.slice(5)) };
  const [y, m] = monthKey(new Date()).split('-').map(Number);
  return { y, m };
}

const shift = (y: number, m: number, delta: number) => {
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
};
const asParam = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: TZ });

function Kpi({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 whitespace-nowrap text-lg font-bold tabular-nums md:text-xl ${tone || 'text-zinc-50'}`}>{value}</p>
    </div>
  );
}

function Bars({ rows }: { rows: { label: string; value: number; extra?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (rows.length === 0) return <p className="text-sm text-zinc-500">Sem dados neste mês.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate text-zinc-300">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-zinc-100">
              {brl(r.value)}
              {r.extra ? <span className="ml-2 font-normal text-zinc-500">{r.extra}</span> : null}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-zinc-200" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ m?: string; view?: string }> }) {
  const { m: rawMonth, view } = await searchParams;
  const info = await getUserInfo();
  if (!info.userId) redirect('/login');
  if (!info.bandId) redirect('/onboarding');

  const isOwner = info.role === 'admin';
  const mode: 'banda' | 'meus' = isOwner && view !== 'meus' ? 'banda' : 'meus';
  const { y, m } = parseMonth(rawMonth);
  const prev = shift(y, m, -1);
  const next = shift(y, m, 1);
  const monthTitle = `${MONTH_NAMES[m - 1]} de ${y}`;
  const base = view === 'meus' ? '&view=meus' : '';

  const header = (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
          {mode === 'banda' ? 'Relatório' : 'Meus cachês'}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {mode === 'banda' ? `${info.bandName}: faturamento, custos e lucro por mês.` : 'O que você tem a receber em todas as bandas em que toca.'}
        </p>
      </div>
      <div className="flex flex-col items-end gap-3">
        {isOwner && (
          <div className="flex rounded-lg border border-zinc-800 p-0.5 text-xs font-semibold">
            <Link href={`/relatorio?m=${asParam(y, m)}`} className={`rounded-md px-3 py-1.5 ${mode === 'banda' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400'}`}>
              Banda
            </Link>
            <Link href={`/relatorio?view=meus&m=${asParam(y, m)}`} className={`rounded-md px-3 py-1.5 ${mode === 'meus' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400'}`}>
              Meus cachês
            </Link>
          </div>
        )}
        <nav className="flex items-center gap-1 text-sm">
          <Link href={`/relatorio?m=${asParam(prev.y, prev.m)}${base}`} className="rounded-md border border-zinc-800 px-3 py-1.5 text-zinc-300 hover:bg-zinc-900" aria-label="Mês anterior">
            ←
          </Link>
          <span className="min-w-36 text-center font-semibold capitalize text-zinc-100">{monthTitle}</span>
          <Link href={`/relatorio?m=${asParam(next.y, next.m)}${base}`} className="rounded-md border border-zinc-800 px-3 py-1.5 text-zinc-300 hover:bg-zinc-900" aria-label="Próximo mês">
            →
          </Link>
        </nav>
      </div>
    </header>
  );

  const supabase = await createClient();
  const start = monthStart(y, m);
  const end = monthStart(next.y, next.m);
  const seriesStart = monthStart(shift(y, m, -5).y, shift(y, m, -5).m);

  // ───────────────────────── Meus cachês (todas as bandas) ─────────────────────────
  if (mode === 'meus') {
    const memberFilter = info.email ? `user_id.eq.${info.userId},email.eq."${info.email}"` : `user_id.eq.${info.userId}`;
    const { data: myMembers } = await supabase.from('go_members').select('id').or(memberFilter);
    const myIds = (myMembers ?? []).map((r) => r.id as string);

    const { data: myLineup } = myIds.length
      ? await supabase.from('go_lineup').select('id, gig_id, fee_amount, status').in('member_id', myIds)
      : { data: [] as { id: string; gig_id: string; fee_amount: number; status: string }[] };

    const gigIds = [...new Set((myLineup ?? []).map((l) => l.gig_id))];
    const { data: gigRows } = gigIds.length
      ? await supabase.from('go_gigs').select('id, title, start_time, band_id').in('id', gigIds).gte('start_time', seriesStart.toISOString()).lt('start_time', end.toISOString())
      : { data: [] as { id: string; title: string; start_time: string; band_id: string }[] };

    const bandName = new Map(info.memberships.map((b) => [b.bandId, b.name]));
    const gigById = new Map((gigRows ?? []).map((g) => [g.id, g]));
    const items = (myLineup ?? [])
      .map((l) => ({ ...l, fee: Number(l.fee_amount), gig: gigById.get(l.gig_id) }))
      .filter((l) => l.gig);

    const inMonth = items.filter((l) => new Date(l.gig!.start_time) >= start && new Date(l.gig!.start_time) < end);
    const received = inMonth.filter((l) => l.status === 'pago').reduce((s, l) => s + l.fee, 0);
    const pending = inMonth.filter((l) => l.status !== 'pago').reduce((s, l) => s + l.fee, 0);

    const byBand = new Map<string, number>();
    for (const l of inMonth) byBand.set(bandName.get(l.gig!.band_id) ?? 'Banda', (byBand.get(bandName.get(l.gig!.band_id) ?? 'Banda') ?? 0) + l.fee);

    const now = new Date();
    const owed = items.filter((l) => l.status !== 'pago' && new Date(l.gig!.start_time) < now).sort((a, b) => a.gig!.start_time.localeCompare(b.gig!.start_time));
    const owedTotal = owed.reduce((s, l) => s + l.fee, 0);

    return (
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 pb-32 md:p-10">
        {header}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Shows no mês" value={String(inMonth.length)} />
          <Kpi label="Cachê do mês" value={brl(received + pending)} />
          <Kpi label="Recebido" value={brl(received)} />
          <Kpi label="A receber" value={brl(pending)} tone={pending > 0 ? 'text-amber-300' : ''} />
        </div>

        <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-200">Por banda no mês</h2>
          <Bars rows={[...byBand.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)} />
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-1 text-sm font-semibold text-zinc-200">Cachês de shows passados ainda não pagos</h2>
          <p className="mb-4 text-xs text-zinc-500">Nos últimos 6 meses. Total: <span className="font-semibold text-zinc-300">{brl(owedTotal)}</span></p>
          {owed.length === 0 ? (
            <p className="text-sm text-zinc-500">Nada pendente. Tudo pago.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {owed.map((l) => (
                <li key={l.id}>
                  <Link href={`/gigs/${l.gig_id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:opacity-80">
                    <span className="min-w-0 truncate text-zinc-300">
                      {dayLabel(l.gig!.start_time)} · {l.gig!.title}
                      <span className="ml-2 text-zinc-500">{bandName.get(l.gig!.band_id) ?? ''}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-amber-300">{brl(l.fee)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  // ───────────────────────── Relatório da banda (dono) ─────────────────────────
  const { data: gigs } = await supabase
    .from('go_gigs')
    .select('id, title, start_time, gross_value, bring_sound, sound_cost, event_type, track_receipts')
    .eq('band_id', info.bandId)
    .gte('start_time', seriesStart.toISOString())
    .lt('start_time', end.toISOString())
    .order('start_time', { ascending: true });

  const gigList = gigs ?? [];
  const ids = gigList.map((g) => g.id);
  const [lineupRes, expensesRes, paymentsRes] = ids.length
    ? await Promise.all([
        supabase.from('go_lineup').select('gig_id, fee_amount').in('gig_id', ids),
        supabase.from('gig_expenses').select('gig_id, category, amount').in('gig_id', ids),
        supabase.from('gig_payments').select('gig_id, amount').in('gig_id', ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const sumBy = (rows: { gig_id: string; [k: string]: unknown }[] | null, key: string) => {
    const map = new Map<string, number>();
    for (const r of rows ?? []) map.set(r.gig_id, (map.get(r.gig_id) ?? 0) + Number(r[key]));
    return map;
  };
  const lineupByGig = sumBy(lineupRes.data as never, 'fee_amount');
  const expensesByGig = sumBy(expensesRes.data as never, 'amount');
  const paymentsByGig = sumBy(paymentsRes.data as never, 'amount');

  const rows = gigList.map((g) => {
    const gross = Number(g.gross_value);
    const soundCost = g.bring_sound ? Number(g.sound_cost ?? 0) : 0;
    const lineupCost = lineupByGig.get(g.id) ?? 0;
    const expenses = expensesByGig.get(g.id) ?? 0;
    const fin = gigFinance({ gross, lineupCost, soundCost, expenses, trackReceipts: !!g.track_receipts, received: paymentsByGig.get(g.id) ?? 0 });
    return { g, gross, soundCost, lineupCost, expenses, fin, key: monthKey(new Date(g.start_time)) };
  });

  const current = asParam(y, m);
  const month = rows.filter((r) => r.key === current);
  const revenue = month.reduce((s, r) => s + r.gross, 0);
  const received = month.reduce((s, r) => s + r.fin.received, 0);
  const pendingTotal = month.reduce((s, r) => s + r.fin.pending, 0);
  const costs = month.reduce((s, r) => s + r.fin.totalCost, 0);
  const profit = revenue - costs;

  const byType = new Map<string, { value: number; count: number }>();
  for (const r of month) {
    const k = r.g.event_type || 'Não informado';
    const cur = byType.get(k) ?? { value: 0, count: 0 };
    byType.set(k, { value: cur.value + r.gross, count: cur.count + 1 });
  }

  const costByCategory = new Map<string, number>();
  const add = (k: string, v: number) => v > 0 && costByCategory.set(k, (costByCategory.get(k) ?? 0) + v);
  for (const r of month) {
    add('Músicos', r.lineupCost);
    add('Som', r.soundCost);
  }
  const monthIds = new Set(month.map((r) => r.g.id));
  for (const e of (expensesRes.data ?? []) as { gig_id: string; category: string; amount: number }[]) {
    if (monthIds.has(e.gig_id)) add(e.category, Number(e.amount));
  }

  const series = Array.from({ length: 6 }, (_, i) => shift(y, m, i - 5)).map(({ y: yy, m: mm }) => {
    const k = asParam(yy, mm);
    const inMonth = rows.filter((r) => r.key === k);
    return { label: MONTH_NAMES[mm - 1].slice(0, 3), billed: inMonth.reduce((s, r) => s + r.gross, 0), received: inMonth.reduce((s, r) => s + r.fin.received, 0) };
  });
  const seriesMax = Math.max(...series.map((s) => s.billed), 1);

  const pendingGigs = month.filter((r) => r.fin.pending > 0).sort((a, b) => b.fin.pending - a.fin.pending);

  // profit split among the band owners (only when there is more than one)
  const { data: ownerRows } = await supabase.from('band_members').select('user_id, profit_share').eq('band_id', info.bandId).eq('role', 'owner');
  const owners = (ownerRows ?? []) as { user_id: string; profit_share: number | null }[];
  const { data: ownerProfiles } = owners.length > 1 ? await supabase.from('go_profiles').select('id, email, display_name').in('id', owners.map((o) => o.user_id)) : { data: [] };
  const emailOf = new Map((ownerProfiles ?? []).map((p) => [p.id as string, ((p.display_name as string | null) || p.email) as string]));
  const split = owners.length > 1 ? splitProfit(profit, owners.map((o) => ({ id: o.user_id, share: o.profit_share === null ? null : Number(o.profit_share) }))) : [];

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-32 md:p-10">
      {header}

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Shows" value={String(month.length)} />
        <Kpi label="Faturamento" value={brl(revenue)} />
        <Kpi label="Recebido" value={brl(received)} />
        <Kpi label="Pendente" value={brl(pendingTotal)} tone={pendingTotal > 0 ? 'text-amber-300' : ''} />
        <Kpi label="Custos" value={brl(costs)} />
        <Kpi label="Lucro previsto" value={brl(profit)} tone={profit < 0 ? 'text-red-400' : ''} />
      </div>

      <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-200">Faturamento: últimos 6 meses</h2>
        <div className="flex h-40 items-end gap-3" role="img" aria-label="Faturado e recebido por mês">
          {series.map((s) => (
            <div key={s.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-32 w-full items-end justify-center gap-1">
                <div className="w-1/2 max-w-6 rounded-t bg-zinc-200" style={{ height: `${(s.billed / seriesMax) * 100}%` }} title={`Faturado ${brl(s.billed)}`} />
                <div className="w-1/2 max-w-6 rounded-t border border-zinc-500 bg-zinc-700" style={{ height: `${(s.received / seriesMax) * 100}%` }} title={`Recebido ${brl(s.received)}`} />
              </div>
              <span className="text-xs capitalize text-zinc-500">{s.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 flex gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-zinc-200" />Faturado</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm border border-zinc-500 bg-zinc-700" />Recebido</span>
        </p>
      </section>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-200">Faturamento por tipo de evento</h2>
          <Bars rows={[...byType.entries()].map(([label, v]) => ({ label, value: v.value, extra: `${v.count} ${v.count === 1 ? 'show' : 'shows'}` })).sort((a, b) => b.value - a.value)} />
        </section>
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-200">Custos por categoria</h2>
          <Bars rows={[...costByCategory.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)} />
        </section>
      </div>

      {split.length > 0 && (
        <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-1 text-sm font-semibold text-zinc-200">Divisão do lucro entre os donos</h2>
          <p className="mb-4 text-xs text-zinc-500">Sobre o lucro previsto do mês. Ajuste os percentuais no Perfil; sem percentual, a divisão é igual.</p>
          <ul className="divide-y divide-zinc-800">
            {split.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 truncate text-zinc-300">{emailOf.get(r.id) ?? 'Dono'}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="mr-3 text-zinc-500">{r.percent.toFixed(1).replace('.', ',')}%</span>
                  <span className={`font-semibold ${r.amount < 0 ? 'text-red-400' : 'text-zinc-100'}`}>{brl(r.amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-200">Shows com recebimento pendente</h2>
        {pendingGigs.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum recebimento pendente neste mês.</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {pendingGigs.map((r) => (
              <li key={r.g.id}>
                <Link href={`/gigs/${r.g.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:opacity-80">
                  <span className="min-w-0 truncate text-zinc-300">{dayLabel(r.g.start_time)} · {r.g.title}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-amber-300">{brl(r.fin.pending)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import { requireElevatedAdmin } from '@/lib/admin-session';
import { productOverview } from '@/lib/admin-stats';
import { AdminStatCard } from '@/components/admin-stat-card';
import { AdminBarList } from '@/components/admin-bar-list';
import { AdminDailyBars } from '@/components/admin-daily-bars';

export const revalidate = 0;

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Janela fechada de 30 dias: dias sem cadastro entram como zero, senão o eixo do tempo tem buraco. */
function fillDays(rows: { day: string; total: number }[], days = 30): { day: string; total: number }[] {
  const byDay = new Map(rows.map((r) => [r.day, r.total]));
  const out: { day: string; total: number }[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));

  for (let i = 0; i < days; i++) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    out.push({ day: iso, total: byDay.get(iso) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export default async function AdminOverviewPage() {
  await requireElevatedAdmin();
  const data = await productOverview();

  const payingTotal = data.subs.payingCard;
  const activeTotal = payingTotal + data.subs.freeManual;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-sm font-bold text-zinc-100">Contas</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AdminStatCard label="Contas" value={String(data.users.total)} hint="total de cadastros" />
          <AdminStatCard
            label="Voltaram em 30 dias"
            value={String(data.users.active30d)}
            hint={data.users.total > 0 ? `${Math.round((data.users.active30d / data.users.total) * 100)}% das contas` : undefined}
            tone="good"
          />
          <AdminStatCard label="Bandas" value={String(data.bands)} hint={`${data.owners} donos · ${data.members} músicos`} />
          <AdminStatCard
            label="Fundadores"
            value={`${data.founders.used}/${data.founders.limit}`}
            hint={`${data.founders.limit - data.founders.used} vagas restando`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-zinc-100">Assinaturas e faturamento</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AdminStatCard label="MRR estimado" value={brl(data.mrr)} hint={`${payingTotal} pagando por cartão`} tone="good" />
          <AdminStatCard label="Ativas" value={String(activeTotal)} hint={`${data.subs.freeManual} liberadas na mão (fora do MRR)`} />
          <AdminStatCard label="Em teste" value={String(data.subs.trial)} hint="trial de 7 dias" tone="warning" />
          <AdminStatCard label="Expiradas" value={String(data.subs.expired)} hint="dados preservados" />
        </div>
      </section>

      <AdminDailyBars title="Cadastros por dia" data={fillDays(data.signups)} unit="contas novas" />

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminBarList
          title="Telas mais usadas"
          subtitle="Visitas nos últimos 30 dias"
          rows={data.screens.slice(0, 10)}
          empty="Nada registrado ainda — a coleta começa no próximo acesso ao app."
        />
        <AdminBarList
          title="Ações mais usadas"
          subtitle="O que as pessoas fazem, não só abrem (30 dias)"
          rows={data.actions.slice(0, 10)}
          empty="Nenhuma ação registrada ainda."
        />
      </section>
    </div>
  );
}

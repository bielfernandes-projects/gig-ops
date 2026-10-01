import { requireElevatedAdmin } from '@/lib/admin-session';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminUpdateDelete, AdminUpdateForm } from '@/components/admin-updates';
import { UPDATE_LABEL, type UpdateKind } from '@/lib/notification-model';
import { fmtShortDate } from '@/lib/time';

export const revalidate = 0;

type Row = { id: string; kind: UpdateKind; title: string; body: string; published_at: string };

export default async function AdminUpdatesPage() {
  await requireElevatedAdmin();
  const { data } = (await createAdminClient()
    .from('app_updates')
    .select('id, kind, title, body, published_at')
    .order('published_at', { ascending: false })
    .limit(100)) as unknown as { data: Row[] | null };
  const updates = data ?? [];

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Lançar atualização do app</h2>
          <p className="text-xs text-zinc-500">
            Aparece num pop-up para todos (uma vez) na próxima vez que abrirem ou voltarem ao app, e fica na lista &ldquo;Atualizações do app&rdquo; do sino do Dashboard. O push chega no celular de quem ativou, uma vez por dia às 8h (um só para tudo que foi lançado desde o último), a não ser que você marque &ldquo;Enviar push agora&rdquo;.
          </p>
        </div>
        <AdminUpdateForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-zinc-100">Já lançadas</h2>
        {updates.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma atualização lançada ainda.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800">
            {updates.map((u) => (
              <li key={u.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="font-semibold text-zinc-300">{UPDATE_LABEL[u.kind]}</span>
                    <span className="tabular-nums">{fmtShortDate(u.published_at)}</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-100">{u.title}</p>
                  <p className="whitespace-pre-line text-sm text-zinc-400">{u.body}</p>
                </div>
                <AdminUpdateDelete id={u.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

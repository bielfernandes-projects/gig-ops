import { requireElevatedAdmin } from '@/lib/admin-session';
import { listUsers } from '@/lib/admin-stats';
import { AdminUserActions } from '@/components/admin-user-actions';
import { AdminBandAccess } from '@/components/admin-band-access';

export const revalidate = 0;

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

export default async function AdminUsersPage() {
  const { userId: meId } = await requireElevatedAdmin();
  const users = await listUsers();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-zinc-500">
        {users.length} {users.length === 1 ? 'conta' : 'contas'}, da mais nova pra mais antiga.
      </p>

      {/* Tabela larga: o scroll horizontal fica nela, nunca no corpo da página. */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-[11px] uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-2.5 font-semibold">Conta</th>
              <th className="px-4 py-2.5 font-semibold">Bandas e acesso</th>
              <th className="px-4 py-2.5 font-semibold">Criada</th>
              <th className="px-4 py-2.5 font-semibold">Último login</th>
              <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-zinc-800/60 last:border-0 align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-100">{user.displayName ?? user.email}</p>
                  {user.displayName && <p className="text-xs text-zinc-500">{user.email}</p>}
                  {user.id === meId && <p className="text-[11px] font-semibold text-emerald-500">você</p>}
                </td>
                <td className="px-4 py-3">
                  {user.bands.length === 0 ? (
                    <span className="text-xs text-zinc-600">nenhuma</span>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {user.bands.map((band) => (
                        <li key={band.id}>
                          <AdminBandAccess band={band} canManage={band.role === 'owner'} />
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-4 py-3 text-xs tabular-nums text-zinc-400">{date(user.createdAt)}</td>
                <td className="px-4 py-3 text-xs tabular-nums text-zinc-400">{date(user.lastSignInAt)}</td>
                <td className="px-4 py-3">
                  {user.id === meId ? (
                    <p className="text-right text-xs text-zinc-600">—</p>
                  ) : (
                    <AdminUserActions userId={user.id} email={user.email} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

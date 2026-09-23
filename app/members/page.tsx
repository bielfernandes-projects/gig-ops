import { createClient } from '@/lib/supabase/server';
import { GoMember } from '@/lib/types';
import { PostgrestError } from '@supabase/supabase-js';
import { AddNewMemberModal } from '@/components/add-new-member-modal';
import { MembersSearch } from '@/components/members-search';
import { PageHeader } from '@/components/page-header';
import { getUserInfo, ownedBands } from '@/lib/auth';

export const revalidate = 0;

export default async function MembersPage() {
  const info = await getUserInfo();
  const supabase = await createClient();

  // Multi-tenant isolation: scope reads to the bands in the current view. With no band, use a
  // sentinel UUID so the filter matches nothing rather than returning every member.
  const SENTINEL_NO_TENANT = '00000000-0000-0000-0000-000000000000';
  const scope = info.bandIds.length > 0 ? info.bandIds : [SENTINEL_NO_TENANT];
  const owned = ownedBands(info);

  const [membersResult, ownersResult] = await Promise.all([
    supabase
      .from('go_members')
      .select('*')
      .order('name', { ascending: true })
      .in('band_id', scope) as unknown as Promise<{ data: GoMember[] | null, error: PostgrestError | null }>,
    supabase
      .from('band_members')
      .select('user_id, band_id')
      .in('band_id', scope)
      .eq('role', 'owner') as unknown as Promise<{ data: { user_id: string; band_id: string }[] | null }>,
  ]);

  const members = membersResult.data || [];
  const error = membersResult.error;
  const owners = ownersResult.data || [];

  // One group per band in view (just one outside the "Todas as bandas" view); each follows the
  // person's role in that band.
  const groups = info.bandIds
    .map((bandId) => ({
      bandId,
      name: info.bands[bandId]?.name ?? 'Banda',
      role: info.bands[bandId]?.role ?? 'viewer',
      members: members.filter((m) => m.band_id === bandId),
      ownerUserIds: owners.filter((o) => o.band_id === bandId).map((o) => o.user_id),
    }))
    .filter((g) => !info.allBands || g.members.length > 0 || g.role === 'admin');

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:p-10 relative">
      <PageHeader title="Músicos" description="O banco de talentos: quem toca com a banda e em qual instrumento." />

      {error && (
        <div className="p-4 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
          <h2 className="font-bold mb-2">Erro ao carregar músicos</h2>
          <p className="text-sm text-red-400/80">
            Não foi possível carregar a equipe. Verifique sua conexão e tente novamente.
          </p>
        </div>
      )}

      <main className="pb-32 flex flex-col gap-10">
        {members.length === 0 && !error ? (
          <div className="w-full py-20 flex flex-col items-center justify-center text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <p className="text-zinc-400 font-medium">Nenhum músico na sua rede.</p>
            {owned.length > 0 ? (
              <p className="text-zinc-500 text-sm mt-1">Toque no + para começar.</p>
            ) : (
              <p className="text-zinc-500 text-sm mt-1">Peça ao administrador para te cadastrar como músico.</p>
            )}
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.bandId}>
              {info.allBands && <h2 className="mb-3 text-sm font-bold text-zinc-300">{g.name}</h2>}
              <MembersSearch members={g.members} role={g.role} ownerUserIds={g.ownerUserIds} />
            </section>
          ))
        )}
      </main>

      {owned.length > 0 && <AddNewMemberModal bands={owned} />}
    </div>
  );
}

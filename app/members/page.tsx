import { supabase } from '@/lib/supabase';
import { GoMember } from '@/lib/types';
import { PostgrestError } from '@supabase/supabase-js';
import { AddNewMemberModal } from '@/components/add-new-member-modal';
import { MembersSearch } from '@/components/members-search';
import { getUserInfo } from '@/lib/auth';

export const revalidate = 0;

export default async function MembersPage() {
  const { role, userId, invitedBy } = await getUserInfo();

  // Multi-tenant isolation: every read is scoped to a single tenant admin.
  const tenantAdminId = role === 'admin' ? userId : invitedBy;

  let membersResult;
  if (tenantAdminId) {
    membersResult = await supabase
      .from('go_members')
      .select('*')
      .order('name', { ascending: true })
      .eq('admin_id', tenantAdminId);
  } else {
    // No tenant link yet — return an empty set rather than leaking other admins' data.
    membersResult = { data: [] as GoMember[], error: null as PostgrestError | null };
  }

  const members = (membersResult as unknown as { data: GoMember[] | null, error: PostgrestError | null }).data || [];
  const error = (membersResult as unknown as { data: GoMember[] | null, error: PostgrestError | null }).error;

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:p-10 relative">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-50 mb-1">
          Músicos
        </h1>
        <p className="text-zinc-500 text-sm">
          {members.length} {members.length === 1 ? 'profissional' : 'profissionais'} no banco de talentos
        </p>
      </header>

      {error && (
        <div className="p-4 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
          <h2 className="font-bold mb-2">Erro ao carregar os dados:</h2>
          <pre className="text-xs overflow-auto p-4 bg-black/50 rounded-lg">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )}

      <main className="pb-32">
        {members.length === 0 && !error ? (
          <div className="w-full py-20 flex flex-col items-center justify-center text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <p className="text-zinc-400 font-medium">Nenhum músico na sua rede.</p>
            {role === 'admin' && <p className="text-zinc-500 text-sm mt-1">Toque no + para começar.</p>}
            {role !== 'admin' && (
              <p className="text-zinc-500 text-sm mt-1">Peça ao administrador para te cadastrar como músico.</p>
            )}
          </div>
        ) : (
          <MembersSearch members={members} role={role} />
        )}
      </main>

      {role === 'admin' && <AddNewMemberModal />}
    </div>
  );
}

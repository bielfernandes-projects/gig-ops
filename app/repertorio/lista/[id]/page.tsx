import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getUserInfo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { GigSetlist, type SetlistTree, type CatalogOption } from '@/components/gig-setlist';

export const revalidate = 0;

type SetlistRow = SetlistTree & { scope: 'band' | 'personal'; owner_user_id: string | null; band_id: string };

export default async function SetlistLibraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const info = await getUserInfo();
  if (!info.userId) redirect('/login');
  if (info.memberships.length === 0) redirect('/onboarding');

  const supabase = await createClient();
  const { data: setlist } = (await supabase
    .from('setlists')
    .select('id, name, scope, owner_user_id, band_id, blocks(id, name, position, block_songs(id, position, requested_key, reference_key, note, transition_note, songs(id, title, artist, original_key, start_key, notes, bpm, source_url, chart_text, pdf_path)))')
    .eq('id', id)
    .maybeSingle()) as unknown as { data: SetlistRow | null };

  const isPersonalOwner = setlist?.scope === 'personal' && setlist.owner_user_id === info.userId;
  const band = setlist ? info.bands[setlist.band_id] : undefined;
  const isBandMember = setlist?.scope === 'band' && !!band;
  const isBandOwner = isBandMember && band?.role === 'admin';

  // RLS já bloqueia quem não tem acesso — esta checagem é só pra decidir a UI (owner vs leitura).
  if (!setlist || (!isPersonalOwner && !isBandMember)) {
    return (
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-20 text-center">
        <h1 className="mb-2 text-xl font-bold text-zinc-50">Repertório não encontrado</h1>
        <Link href="/repertorio" className="text-sm text-zinc-400 underline underline-offset-4">Voltar ao Repertório</Link>
      </div>
    );
  }

  const isOwner = isPersonalOwner || isBandOwner;

  const [{ data: catalog }, { data: link }, usageCountResult] = await Promise.all([
    supabase.from('songs').select('id, title, artist, original_key').eq('band_id', setlist.band_id).order('title') as unknown as Promise<{ data: CatalogOption[] | null }>,
    (isOwner
      ? createAdminClient().from('setlist_share_links').select('token').eq('setlist_id', setlist.id).is('revoked_at', null).limit(1).maybeSingle()
      : Promise.resolve({ data: null })) as unknown as Promise<{ data: { token: string } | null }>,
    supabase.from('go_gigs').select('id', { count: 'exact', head: true }).eq('setlist_id', setlist.id),
  ]);
  const usageCount = (usageCountResult as { count: number | null }).count ?? 0;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 pb-32 md:p-10">
      <Link href="/repertorio" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-50">
        <ArrowLeft className="h-4 w-4" /> Repertório
      </Link>
      <h1 className="mb-1 text-3xl font-bold tracking-tight text-zinc-50">{setlist.name}</h1>
      <p className="mb-8 text-sm text-zinc-500">
        {setlist.scope === 'personal'
          ? 'Repertório pessoal: só você vê. Pode usar músicas da banda e as suas.'
          : usageCount > 0
            ? `Repertório da banda, anexado a ${usageCount} ${usageCount === 1 ? 'show' : 'shows'}.`
            : 'Repertório da banda, ainda não anexado a nenhum show.'}
      </p>

      <GigSetlist gigId="" setlist={setlist} catalog={catalog ?? []} isOwner={isOwner} shareToken={link?.token ?? null} bandSetlists={[]} usageCount={usageCount} />
    </div>
  );
}

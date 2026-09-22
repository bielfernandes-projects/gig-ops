import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getUserInfo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { GigSetlist, type SetlistTree, type CatalogOption } from '@/components/gig-setlist';

export const revalidate = 0;

type Personal = SetlistTree & { scope: 'band' | 'personal'; owner_user_id: string | null };

export default async function PersonalSetlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const info = await getUserInfo();
  if (!info.userId) redirect('/login');
  if (!info.bandId) redirect('/onboarding');

  const supabase = await createClient();
  const { data: setlist } = (await supabase
    .from('setlists')
    .select('id, name, scope, owner_user_id, blocks(id, name, position, block_songs(id, position, requested_key, reference_key, note, transition_note, songs(id, title, artist, original_key, bpm, source_url, chart_text, pdf_path)))')
    .eq('id', id)
    .maybeSingle()) as unknown as { data: Personal | null };

  // Only the person who created a personal setlist can open it here.
  if (!setlist || setlist.scope !== 'personal' || setlist.owner_user_id !== info.userId) {
    return (
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-20 text-center">
        <h1 className="mb-2 text-xl font-bold text-zinc-50">Repertório não encontrado</h1>
        <Link href="/repertorio" className="text-sm text-zinc-400 underline underline-offset-4">Voltar ao Repertório</Link>
      </div>
    );
  }

  const [{ data: catalog }, { data: link }] = await Promise.all([
    supabase.from('songs').select('id, title, artist, original_key').eq('band_id', info.bandId).order('title') as unknown as Promise<{ data: CatalogOption[] | null }>,
    createAdminClient().from('setlist_share_links').select('token').eq('setlist_id', setlist.id).is('revoked_at', null).limit(1).maybeSingle(),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 pb-32 md:p-10">
      <Link href="/repertorio" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-50">
        <ArrowLeft className="h-4 w-4" /> Repertório
      </Link>
      <h1 className="mb-1 text-3xl font-bold tracking-tight text-zinc-50">{setlist.name}</h1>
      <p className="mb-8 text-sm text-zinc-500">Repertório pessoal: só você vê. Pode usar músicas da banda e as suas.</p>

      <GigSetlist gigId="" setlist={setlist} catalog={catalog ?? []} isOwner shareToken={link?.token ?? null} />
    </div>
  );
}

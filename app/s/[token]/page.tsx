import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { PublicSetlistView, type PublicBlock } from '@/components/public-setlist-view';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Repertório', robots: { index: false, follow: false } };

type Tree = { name: string; blocks: PublicBlock[] };

/**
 * Public, read-only view: o repertório completo (música, tom, observação, nota de passagem,
 * cifra e PDF), sem login e sem nenhuma ação de edição. O token é o segredo, então esta página
 * lê com o service role e nunca expõe outra coisa além do que está nos blocos deste setlist.
 */
export default async function SharedSetlist({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const valid = /^[a-f0-9]{64}$/.test(token);
  const { data: link } = valid
    ? await admin.from('setlist_share_links').select('setlist_id').eq('token', token).is('revoked_at', null).maybeSingle()
    : { data: null };

  const { data: setlist } = link
    ? ((await admin
        .from('setlists')
        .select('name, blocks(id, name, position, block_songs(id, position, requested_key, reference_key, note, transition_note, songs(id, title, artist, original_key, start_key, notes, bpm, source_url, chart_text, pdf_path)))')
        .eq('id', link.setlist_id)
        .maybeSingle()) as unknown as { data: Tree | null })
    : { data: null };

  if (!setlist) {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-zinc-950 p-6 text-center text-zinc-300">
        <div>
          <h1 className="mb-2 text-xl font-bold text-zinc-50">Link indisponível</h1>
          <p className="text-sm text-zinc-500">Este link não existe ou foi revogado por quem o compartilhou.</p>
        </div>
      </div>
    );
  }

  return <PublicSetlistView token={token} name={setlist.name} blocks={setlist.blocks} />;
}

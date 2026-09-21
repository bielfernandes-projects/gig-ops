import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Repertório', robots: { index: false, follow: false } };

type Tree = {
  name: string;
  blocks: {
    id: string;
    name: string;
    position: number;
    block_songs: {
      id: string;
      position: number;
      requested_key: string | null;
      reference_key: string | null;
      songs: { title: string; artist: string | null; original_key: string | null } | null;
    }[];
  }[];
};

/**
 * Public, read-only view: order and keys only (no login). The token is the secret,
 * so this page reads with the service role and only ever exposes these fields.
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
        .select('name, blocks(id, name, position, block_songs(id, position, requested_key, reference_key, songs(title, artist, original_key)))')
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

  const blocks = [...setlist.blocks].sort((a, b) => a.position - b.position);
  // running song number at the start of each block
  const offsets = blocks.map((_, i) => blocks.slice(0, i).reduce((sum, b) => sum + b.block_songs.length, 0));

  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto bg-zinc-950 px-4 py-8 text-zinc-100">
      <main className="mx-auto w-full max-w-xl">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">{setlist.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">Repertório do show: ordem e tons.</p>

        <div className="mt-8 flex flex-col gap-6">
          {blocks.map((block, bi) => (
            <section key={block.id}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{block.name}</h2>
              <ol className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900">
                {[...block.block_songs]
                  .sort((a, b) => a.position - b.position)
                  .map((bs, si) => {
                    const n = offsets[bi] + si + 1;
                    const key = bs.requested_key || bs.reference_key || bs.songs?.original_key;
                    return (
                      <li key={bs.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="w-6 shrink-0 text-sm tabular-nums text-zinc-500">{n}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{bs.songs?.title ?? 'Música'}</p>
                          {bs.songs?.artist && <p className="truncate text-xs text-zinc-500">{bs.songs.artist}</p>}
                        </div>
                        {key && <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-sm font-black text-zinc-900">{key}</span>}
                      </li>
                    );
                  })}
              </ol>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

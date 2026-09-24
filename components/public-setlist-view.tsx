'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { SongViewer, type SongView } from '@/components/song-viewer';
import { getPublicSongPdfUrl } from '@/app/actions/setlist-actions';

export type PublicSong = {
  id: string;
  title: string;
  artist: string | null;
  original_key: string | null;
  bpm: number | null;
  source_url: string | null;
  chart_text: string | null;
  pdf_path: string | null;
};
export type PublicItem = {
  id: string;
  position: number;
  requested_key: string | null;
  reference_key: string | null;
  note: string | null;
  transition_note: string | null;
  songs: PublicSong | null;
};
export type PublicBlock = { id: string; name: string; position: number; block_songs: PublicItem[] };

export function PublicSetlistView({ token, name, blocks }: { token: string; name: string; blocks: PublicBlock[] }) {
  const [viewing, setViewing] = useState<SongView | null>(null);
  const sorted = [...blocks].sort((a, b) => a.position - b.position);
  const offsets = sorted.map((_, i) => sorted.slice(0, i).reduce((sum, b) => sum + b.block_songs.length, 0));

  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto bg-zinc-950 px-4 py-8 text-zinc-100">
      <main className="mx-auto w-full max-w-xl">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">{name}</h1>
        <p className="mt-1 text-sm text-zinc-500">Repertório completo — só visualização.</p>

        <div className="mt-8 flex flex-col gap-6">
          {sorted.map((block, bi) => (
            <section key={block.id}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{block.name}</h2>
              <ol className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900">
                {[...block.block_songs]
                  .sort((a, b) => a.position - b.position)
                  .map((bs, si) => {
                    const n = offsets[bi] + si + 1;
                    const key = bs.requested_key || bs.reference_key || bs.songs?.original_key;
                    const song = bs.songs;
                    return (
                      <li key={bs.id}>
                        <button
                          type="button"
                          onClick={() => song && setViewing({ ...song, requested_key: bs.requested_key, note: bs.note })}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/40"
                        >
                          <span className="w-6 shrink-0 text-sm tabular-nums text-zinc-500">{n}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{song?.title ?? 'Música'}</p>
                            {song?.artist && <p className="truncate text-xs text-zinc-500">{song.artist}</p>}
                            {bs.note && <p className="truncate text-xs text-amber-300">{bs.note}</p>}
                          </div>
                          {key && <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-sm font-black text-zinc-900">{key}</span>}
                          {song?.chart_text && <FileText className="h-4 w-4 shrink-0 text-zinc-500" />}
                        </button>
                        {bs.transition_note && <p className="px-4 pb-3 text-xs text-amber-300/80">Passagem: {bs.transition_note}</p>}
                      </li>
                    );
                  })}
              </ol>
            </section>
          ))}
        </div>
      </main>

      {viewing && (
        <SongViewer song={viewing} onClose={() => setViewing(null)} fetchPdfUrl={(songId) => getPublicSongPdfUrl(token, songId)} emptyMessage="Esta música não tem cifra ou letra cadastrada." />
      )}
    </div>
  );
}

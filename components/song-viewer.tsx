'use client';

import { X, ExternalLink } from 'lucide-react';

export type SongView = {
  title: string;
  artist: string | null;
  original_key: string | null;
  requested_key?: string | null;
  bpm: number | null;
  source_url: string | null;
  chart_text: string | null;
  note?: string | null;
};

/** Full-screen reader for a song's chart/lyrics (the text the musician pasted). */
export function SongViewer({ song, onClose }: { song: SongView; onClose: () => void }) {
  const key = song.requested_key || song.original_key;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950" role="dialog" aria-modal="true" aria-label={song.title}>
      <header className="flex items-start justify-between gap-4 border-b border-zinc-800 px-4 py-3 md:px-8">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-zinc-50 md:text-2xl">{song.title}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-zinc-400">
            {song.artist && <span>{song.artist}</span>}
            {key && (
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-semibold text-zinc-100">
                Tom {key}
                {song.requested_key && song.original_key && song.requested_key !== song.original_key ? ` (original ${song.original_key})` : ''}
              </span>
            )}
            {song.bpm && <span>{song.bpm} BPM</span>}
            {song.source_url && (
              <a href={song.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-zinc-200">
                Abrir fonte <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </p>
          {song.note && <p className="mt-1 text-sm font-medium text-amber-300">{song.note}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
          <X className="h-6 w-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {song.chart_text ? (
          <pre className="mx-auto max-w-4xl whitespace-pre-wrap break-words font-mono text-lg leading-relaxed text-zinc-100 md:text-xl">{song.chart_text}</pre>
        ) : (
          <p className="mx-auto max-w-md pt-16 text-center text-zinc-500">
            Esta música ainda não tem cifra ou letra. Edite a música no catálogo e cole o texto.
          </p>
        )}
      </div>
    </div>
  );
}

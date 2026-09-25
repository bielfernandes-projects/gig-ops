'use client';

import { useMemo, useState } from 'react';
import { X, ExternalLink, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { transposeChart, transposeStartKey } from '@/lib/transpose';
import { getSongPdfUrl } from '@/app/actions/song-actions';

export type SongView = {
  id?: string;
  title: string;
  artist: string | null;
  original_key: string | null;
  requested_key?: string | null;
  start_key?: string | null;
  notes?: string | null;
  bpm: number | null;
  source_url: string | null;
  lyrics_url?: string | null;
  chart_text: string | null;
  pdf_path?: string | null;
  note?: string | null;
};

type PdfUrlFetcher = (songId: string) => Promise<{ url?: string; error?: string }>;

/**
 * Full-screen reader for a song's chart/lyrics (the text the musician pasted). `fetchPdfUrl`
 * defaults to the band-membership-gated action; the public (no-login) setlist view passes a
 * token-scoped one instead, since the caller there has no authenticated session.
 */
export function SongViewer({ song, onClose, fetchPdfUrl = getSongPdfUrl, emptyMessage = 'Esta música não tem texto salvo. Use os links de cifra e letra ou o PDF.' }: { song: SongView; onClose: () => void; fetchPdfUrl?: PdfUrlFetcher; emptyMessage?: string }) {
  const key = song.requested_key || song.original_key;
  const changed = !!(song.requested_key && song.original_key && song.requested_key !== song.original_key);
  const [showOriginal, setShowOriginal] = useState(false);
  const startKey = showOriginal ? song.start_key : transposeStartKey(song.start_key, song.original_key, song.requested_key);
  const text = useMemo(
    () => (song.chart_text && !showOriginal ? transposeChart(song.chart_text, song.original_key, song.requested_key) : song.chart_text),
    [song.chart_text, song.original_key, song.requested_key, showOriginal]
  );

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
            {startKey && <span className="rounded bg-amber-300 px-1.5 py-0.5 font-semibold text-black">Tom que começa {startKey}</span>}
            {song.bpm && <span>{song.bpm} BPM</span>}
            {changed && song.chart_text && (
              <button type="button" onClick={() => setShowOriginal((v) => !v)} className="underline underline-offset-4 hover:text-zinc-200">
                {showOriginal ? `Ver no tom ${song.requested_key}` : 'Ver no tom original'}
              </button>
            )}
            {song.source_url && (
              <a href={song.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-zinc-200">
                Abrir cifra <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {song.lyrics_url && (
              <a href={song.lyrics_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-zinc-200">
                Abrir letra <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {song.pdf_path && song.id && (
              <button
                type="button"
                onClick={async () => {
                  const res = await fetchPdfUrl(song.id!);
                  if (res.error || !res.url) return toast.error(res.error ?? 'Não foi possível abrir o PDF.');
                  window.open(res.url, '_blank', 'noopener,noreferrer');
                }}
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-zinc-200"
              >
                Abrir PDF <Paperclip className="h-3.5 w-3.5" />
              </button>
            )}
          </p>
          {song.note && <p className="mt-1 text-sm font-medium text-amber-300">{song.note}</p>}
          {song.notes && <p className="mt-1 whitespace-pre-line text-sm text-zinc-400">{song.notes}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
          <X className="h-6 w-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {text ? (
          <pre className="mx-auto max-w-4xl whitespace-pre-wrap break-words font-mono text-lg leading-relaxed text-zinc-100 md:text-xl">{text}</pre>
        ) : (
          <p className="mx-auto max-w-md pt-16 text-center text-zinc-500">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}

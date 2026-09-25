'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, X, Minus, Plus, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { transposeChart } from '@/lib/transpose';
import { getSongPdfUrl } from '@/app/actions/song-actions';

export type StageItem = {
  id: string;
  songId: string | null;
  block: string;
  title: string;
  artist: string | null;
  key: string | null;
  originalKey: string | null;
  startKey: string | null;
  songNotes: string | null;
  bpm: number | null;
  note: string | null;
  transitionNote: string | null;
  chart: string | null;
  pdfPath: string | null;
};

const SIZES = [16, 20, 24, 30, 38, 48];

/** Dark, high-contrast performance view: one song at a time, screen kept awake. */
export function StageView({ name, items, backHref }: { name: string; items: StageItem[]; backHref: string }) {
  const router = useRouter();
  // volta pra tela de onde veio (show ou biblioteca); sem historico, cai no backHref
  const goBack = (e: React.MouseEvent) => {
    if (window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  };
  const [index, setIndex] = useState(0);
  const [size, setSize] = useState(2);

  // remember the font size on this device
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem('stage-font'));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Number.isInteger(saved) && saved >= 0 && saved < SIZES.length) setSize(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('stage-font', String(size));
    } catch {
      /* storage unavailable */
    }
  }, [size]);

  // keep the screen on while performing
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null;
      } catch {
        /* not supported or denied */
      }
    };
    request();
    const onVisible = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => undefined);
    };
  }, []);

  const go = useCallback((delta: number) => setIndex((i) => Math.min(items.length - 1, Math.max(0, i + delta))), [items.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const item = items[index];
  const chart = useMemo(() => (item?.chart ? transposeChart(item.chart, item.originalKey, item.key) : null), [item]);
  const changed = item?.key && item.originalKey && item.key !== item.originalKey;

  if (!item) {
    return (
      <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4 bg-black p-6 text-center text-zinc-300">
        <p>Este repertório ainda não tem músicas.</p>
        <Link href={backHref} onClick={goBack} className="rounded-md bg-white px-4 py-2 text-sm font-bold text-black">Voltar</Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[999] flex flex-col bg-black text-white">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-800 px-3 py-2">
        <Link href={backHref} onClick={goBack} aria-label="Sair do modo palco" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white">
          <X className="h-6 w-6" />
        </Link>
        <div className="min-w-0 text-center">
          <p className="truncate text-xs text-zinc-500">{name}</p>
          <p className="text-sm font-semibold tabular-nums text-zinc-300">{index + 1} de {items.length}</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Diminuir letra" disabled={size === 0} onClick={() => setSize((s) => s - 1)} className="rounded-lg p-2 text-zinc-300 hover:bg-zinc-900 disabled:opacity-30"><Minus className="h-5 w-5" /></button>
          <button type="button" aria-label="Aumentar letra" disabled={size === SIZES.length - 1} onClick={() => setSize((s) => s + 1)} className="rounded-lg p-2 text-zinc-300 hover:bg-zinc-900 disabled:opacity-30"><Plus className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="border-b border-zinc-900 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{item.block}</p>
        <h1 className="text-2xl font-black leading-tight md:text-4xl">{item.title}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
          {item.artist && <span>{item.artist}</span>}
          {item.key && (
            <span className="rounded bg-white px-2 py-0.5 text-base font-black text-black">
              {item.key}
              {changed ? <span className="ml-1 text-xs font-semibold">(orig. {item.originalKey})</span> : null}
            </span>
          )}
          {item.startKey && <span className="rounded bg-amber-300 px-2 py-0.5 text-base font-black text-black">Começa em {item.startKey}</span>}
          {item.bpm && <span>{item.bpm} BPM</span>}
          {item.pdfPath && item.songId && (
            <button
              type="button"
              onClick={async () => {
                const res = await getSongPdfUrl(item.songId!);
                if (res.error) return toast.error(res.error);
                window.open(res.url, '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex items-center gap-1 underline underline-offset-4"
            >
              Abrir PDF <Paperclip className="h-3.5 w-3.5" />
            </button>
          )}
        </p>
        {item.note && <p className="mt-1 text-base font-semibold text-amber-300">{item.note}</p>}
        {item.songNotes && <p className="mt-1 whitespace-pre-line text-sm text-zinc-400">{item.songNotes}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {chart ? (
          <pre className="whitespace-pre-wrap break-words font-mono leading-relaxed text-zinc-50" style={{ fontSize: SIZES[size] }}>{chart}</pre>
        ) : (
          <p className="pt-10 text-center text-zinc-500">Sem cifra ou letra cadastrada para esta música.</p>
        )}
        {item.transitionNote && (
          <p className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-base font-semibold text-amber-200">
            Passagem para a próxima: {item.transitionNote}
          </p>
        )}
      </div>

      <nav className="grid grid-cols-2 gap-2 border-t border-zinc-800 p-2">
        <button type="button" onClick={() => go(-1)} disabled={index === 0} className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 py-4 text-lg font-bold active:bg-zinc-800 disabled:opacity-30">
          <ChevronLeft className="h-6 w-6" /> Anterior
        </button>
        <button type="button" onClick={() => go(1)} disabled={index === items.length - 1} className="flex items-center justify-center gap-2 rounded-xl bg-white py-4 text-lg font-bold text-black active:bg-zinc-200 disabled:opacity-30">
          Próxima <ChevronRight className="h-6 w-6" />
        </button>
      </nav>
    </div>
  );
}

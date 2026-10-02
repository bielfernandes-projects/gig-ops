'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Progress bar for the AI import read. The request is a single fetch with no real progress
 * signal, so the bar is an estimate: it eases toward 95% and only the response ends it.
 */
export function ReadProgress({ what }: { what: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 250);
    return () => clearInterval(id);
  }, []);

  const pct = Math.round(95 * (1 - Math.exp(-elapsed / 20)));

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-300" role="status" aria-live="polite">
      <p className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Lendo {what}... isso pode levar até um minuto.
      </p>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="h-full rounded-full bg-zinc-100 transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">{pct}% · Não feche esta janela até terminar.</p>
    </div>
  );
}

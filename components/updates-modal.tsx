'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { getUpdates, markUpdatesSeen } from '@/app/actions/notification-actions';
import { shouldTrack } from '@/components/screen-tracker';
import { UPDATE_LABEL, type AppUpdate, type UpdateKind } from '@/lib/notification-model';
import { fmtShortDate } from '@/lib/time';

/** Event the bell fires to open the history ("Atualizações do app"). */
export const OPEN_UPDATES_EVENT = 'gigueiros:open-updates';

const BADGE: Record<UpdateKind, string> = {
  funcionalidade: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  melhoria: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  bug: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
};

/**
 * "Atualizações do app": opens by itself when there is something launched since the person last closed it.
 * It checks on each app screen and whenever the app comes back to the foreground (people keep the app open
 * and never log in again), at most once a minute. The bell opens it on demand, showing the latest updates
 * as history. Closing marks everything as seen. Mounted in the root layout.
 */
const CHECK_EVERY_MS = 60_000;

export function UpdatesModal() {
  const pathname = usePathname();
  const lastCheck = useRef(0);
  const [state, setState] = useState<{ updates: AppUpdate[]; mode: 'new' | 'all' } | null>(null);

  const check = useCallback(() => {
    if (Date.now() - lastCheck.current < CHECK_EVERY_MS) return;
    lastCheck.current = Date.now();
    getUpdates('new')
      .then(({ updates }) => updates.length > 0 && setState((s) => s ?? { updates, mode: 'new' }))
      .catch(() => {
        // Offline or session gone: nothing was marked as seen, so it comes back on the next check.
      });
  }, []);

  useEffect(() => {
    if (!shouldTrack(pathname)) {
      lastCheck.current = 0; // outside the app (login): the next person to enter is checked right away
      return;
    }
    check();
  }, [pathname, check]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && shouldTrack(window.location.pathname) && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [check]);

  useEffect(() => {
    const open = () =>
      getUpdates('all')
        .then(({ updates }) => setState({ updates, mode: 'all' }))
        .catch(() => {});
    window.addEventListener(OPEN_UPDATES_EVENT, open);
    return () => window.removeEventListener(OPEN_UPDATES_EVENT, open);
  }, []);

  const open = state !== null;
  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add('modal-open');
    return () => document.documentElement.classList.remove('modal-open');
  }, [open]);

  const close = () => {
    setState(null);
    void markUpdatesSeen();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!state) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Atualizações do app" onClick={close}>
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-50">{state.mode === 'new' ? 'O que há de novo' : 'Atualizações do app'}</h2>
            <p className="text-xs text-zinc-500">{state.mode === 'new' ? 'Mudanças desde a sua última visita.' : 'As últimas mudanças no Gigueiros.'}</p>
          </div>
          <button type="button" onClick={close} aria-label="Fechar" className="rounded p-1 text-zinc-400 hover:text-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.updates.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">Nenhuma atualização publicada ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-800/70 overflow-y-auto">
            {state.updates.map((u) => (
              <li key={u.id} className="flex flex-col gap-1.5 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full border px-2 py-0.5 font-semibold ${BADGE[u.kind]}`}>{UPDATE_LABEL[u.kind]}</span>
                  <span className="text-zinc-500">{fmtShortDate(u.publishedAt)}</span>
                  {state.mode === 'all' && u.isNew && <span className="font-semibold text-emerald-400">novo</span>}
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">{u.title}</h3>
                <p className="whitespace-pre-line text-sm text-zinc-400">{u.body}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-zinc-800 px-5 py-3">
          <button type="button" onClick={close} className="w-full rounded-md bg-zinc-100 py-2 text-sm font-bold text-zinc-900 hover:bg-white">
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

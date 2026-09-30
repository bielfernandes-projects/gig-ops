'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Banknote, Bell, CalendarPlus, CalendarX, ChevronRight, Clock, Megaphone, UserCheck, UserPlus, type LucideIcon } from 'lucide-react';
import { getBellData, markNotificationsRead, type BellData } from '@/app/actions/notification-actions';
import { OPEN_UPDATES_EVENT } from '@/components/updates-modal';
import { timeAgo } from '@/lib/notification-model';

const ICONS: Record<string, LucideIcon> = {
  escalado: CalendarPlus,
  pagamento: Banknote,
  presenca: UserCheck,
  lembrete: Clock,
  cancelamento: CalendarX,
  entrada: UserPlus,
};

/**
 * Bell of the Dashboard: the person's notifications plus a line that opens "Atualizações do app".
 * Opening the panel marks the notifications as read (the ones that were unread stay highlighted
 * until it closes). Loaded on mount and again every time the panel opens.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BellData | null>(null);
  const [cleared, setCleared] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(() => getBellData().then(setData).catch(() => {}), []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  async function toggle() {
    if (open) return setOpen(false);
    setOpen(true);
    setCleared(false);
    await load();
    setCleared(true);
    void markNotificationsRead();
  }

  const badge = (cleared ? 0 : (data?.unread ?? 0)) + (data?.newUpdates ?? 0);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={badge > 0 ? `Notificações (${badge} novas)` : 'Notificações'}
        aria-expanded={open}
        className="relative shrink-0 rounded-full border border-zinc-700 bg-zinc-800 p-2.5 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-zinc-950">{badge > 9 ? '9+' : badge}</span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-[70] flex max-h-[70vh] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-96">
          <div className="border-b border-zinc-800 px-4 py-3 text-sm font-bold text-zinc-100">Notificações</div>
          <div className="overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new Event(OPEN_UPDATES_EVENT));
              }}
              className="flex w-full items-center gap-3 border-b border-zinc-800/70 px-4 py-3 text-left hover:bg-zinc-900"
            >
              <Megaphone className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="flex-1 text-sm font-semibold text-zinc-100">Atualizações do app</span>
              {(data?.newUpdates ?? 0) > 0 && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-zinc-950">{data?.newUpdates} {data?.newUpdates === 1 ? 'nova' : 'novas'}</span>}
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
            </button>

            {!data ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">Carregando...</p>
            ) : data.notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">Nenhuma notificação ainda. Avisos de escala, pagamentos e lembretes aparecem aqui.</p>
            ) : (
              <ul className="divide-y divide-zinc-800/70">
                {data.notifications.map((n) => {
                  const Icon = ICONS[n.kind] ?? Bell;
                  const fresh = !n.readAt;
                  const body = (
                    <>
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${fresh ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={`text-sm ${fresh ? 'font-semibold text-zinc-50' : 'font-medium text-zinc-300'}`}>{n.title}</span>
                        {n.body && <span className="text-xs text-zinc-500">{n.body}</span>}
                        <span className="text-[11px] text-zinc-600">{timeAgo(n.createdAt)}</span>
                      </span>
                    </>
                  );
                  const cls = `flex items-start gap-3 px-4 py-3 ${fresh ? 'bg-emerald-500/5' : ''}`;
                  return (
                    <li key={n.id}>
                      {n.url ? (
                        <Link href={n.url} onClick={() => setOpen(false)} className={`${cls} hover:bg-zinc-900`}>
                          {body}
                        </Link>
                      ) : (
                        <div className={cls}>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Client-safe types and small rules for the notification bell and the "Atualizações do app" pop-up.
import { fmtShortDate } from '@/lib/time';

export type NotificationKind = 'escalado' | 'pagamento' | 'presenca' | 'lembrete' | 'cancelamento' | 'entrada';

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};

export const UPDATE_KINDS = ['funcionalidade', 'melhoria', 'bug'] as const;
export type UpdateKind = (typeof UPDATE_KINDS)[number];

export const UPDATE_LABEL: Record<UpdateKind, string> = {
  funcionalidade: 'Nova funcionalidade',
  melhoria: 'Melhoria',
  bug: 'Correção de bug',
};

export type AppUpdate = {
  id: string;
  kind: UpdateKind;
  title: string;
  body: string;
  /** Date shown to people (chosen by the admin). */
  publishedAt: string;
  /** True when it was launched after the person last closed the pop-up. */
  isNew: boolean;
};

/** An update is new when it was launched after the person last closed the pop-up. */
export const isNewUpdate = (createdAt: string, seenAt: string | null) => !seenAt || Date.parse(createdAt) > Date.parse(seenAt);

/** "agora", "há 5 min", "há 3 h", "há 2 d", or the short date after a week. */
export function timeAgo(iso: string, now = Date.now()): string {
  const min = Math.floor((now - Date.parse(iso)) / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.floor(min / 60)} h`;
  if (min < 10_080) return `há ${Math.floor(min / 1440)} d`;
  return fmtShortDate(iso);
}

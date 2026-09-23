'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { switchBand } from '@/app/profile/actions';
import { ALL_BANDS } from '@/lib/band-view';

export type BandOption = { bandId: string; name: string; role: 'owner' | 'member' };

/** Fired after anything that changes the person's bands (join, create, leave) so the filter reloads. */
export const BANDS_CHANGED = 'gg:bands-changed';

/**
 * Global band filter (sidebar on desktop, top bar on phones). Loads the person's bands itself,
 * since it lives in the root layout; only shown to people who belong to more than one band.
 * Selected band null = "Todas as bandas".
 */
export function BandFilter({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<{ memberships: BandOption[]; bandId: string | null } | null>(null);

  const load = useCallback(() => {
    fetch('/api/bands')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {});
  }, []);

  useEffect(load, [load, pathname]);
  useEffect(() => {
    window.addEventListener(BANDS_CHANGED, load);
    return () => window.removeEventListener(BANDS_CHANGED, load);
  }, [load]);

  if (!data || data.memberships.length < 2) return null;

  return (
    <select
      aria-label="Filtrar por banda"
      value={data.bandId ?? ALL_BANDS}
      disabled={pending}
      onChange={(e) => {
        const bandId = e.target.value;
        setData({ ...data, bandId: bandId === ALL_BANDS ? null : bandId });
        startTransition(async () => {
          const res = await switchBand(bandId);
          if (res?.error) toast.error(res.error);
          else router.refresh();
        });
      }}
      className={`rounded-lg border border-zinc-700 bg-zinc-950 font-semibold text-zinc-100 focus:border-zinc-500 focus:outline-none ${
        compact ? 'w-full min-w-0 px-2 py-1.5 text-xs' : 'w-full px-3 py-2 text-sm'
      }`}
    >
      <option value={ALL_BANDS}>Todas as bandas</option>
      {data.memberships.map((m) => (
        <option key={m.bandId} value={m.bandId}>
          {m.name}
          {m.role === 'owner' ? '' : ' (músico)'}
        </option>
      ))}
    </select>
  );
}

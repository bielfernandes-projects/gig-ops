'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BANDS_CHANGED, type BandOption } from '@/components/band-switcher';

/**
 * Whether the "Músicos" entry makes sense in the current view: not when every account in view is a
 * Freela (one person, no team). Loads the person's accounts like the band filter does; until they
 * arrive, or when the request fails, the entry stays visible.
 */
export function useShowTeam(): boolean {
  const pathname = usePathname();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const load = () =>
      fetch('/api/bands')
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { memberships: BandOption[]; bandId: string | null } | null) => {
          if (!d) return;
          const inView = d.bandId ? d.memberships.filter((m) => m.bandId === d.bandId) : d.memberships;
          setShow(inView.length === 0 || inView.some((m) => m.kind !== 'freela'));
        })
        .catch(() => {});
    load();
    window.addEventListener(BANDS_CHANGED, load);
    return () => window.removeEventListener(BANDS_CHANGED, load);
  }, [pathname]);

  return show;
}

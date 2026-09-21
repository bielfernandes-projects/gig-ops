'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { switchBand } from '@/app/profile/actions';

export type BandOption = { bandId: string; name: string; role: 'owner' | 'member' };

/** Shown only to people who belong to more than one band. */
export function BandSwitcher({ memberships, currentBandId }: { memberships: BandOption[]; currentBandId: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (memberships.length < 2) return null;

  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
      Banda
      <select
        value={currentBandId ?? ''}
        disabled={pending}
        onChange={(e) => {
          const bandId = e.target.value;
          startTransition(async () => {
            const res = await switchBand(bandId);
            if (res?.error) toast.error(res.error);
            else router.refresh();
          });
        }}
        className="max-w-[200px] rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 focus:border-zinc-500 focus:outline-none"
      >
        {memberships.map((m) => (
          <option key={m.bandId} value={m.bandId}>
            {m.name}
            {m.role === 'owner' ? '' : ' (músico)'}
          </option>
        ))}
      </select>
    </label>
  );
}

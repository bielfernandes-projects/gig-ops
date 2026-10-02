'use client';

import { useEffect, useRef, useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { InstagramLink } from '@/components/instagram-link';
import { InstallAppButton } from '@/components/install-app-button';
import { ThemeToggle } from '@/components/theme-toggle';

const iconBtn = 'shrink-0 rounded-full border border-zinc-700 bg-zinc-800 p-2.5 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white';

/** One button in the sidebar footer that opens the secondary actions (install, Instagram, theme) to its right. */
export function SidebarExtras() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Mais opções" aria-expanded={open} title="Mais opções" className={iconBtn}>
        <Ellipsis className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute bottom-0 left-full z-[70] ml-2 flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 p-1.5 shadow-lg">
          <InstallAppButton iconClassName="h-4 w-4" className={iconBtn} />
          <InstagramLink iconClassName="h-4 w-4" className={iconBtn} />
          <ThemeToggle />
        </div>
      )}
    </div>
  );
}

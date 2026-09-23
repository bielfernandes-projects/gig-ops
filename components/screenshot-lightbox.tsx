'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X } from 'lucide-react';

export type Shot = { src: string; alt: string; width: number; height: number; caption?: string };
type Device = 'laptop' | 'tablet' | 'phone';

/** A screenshot that opens full-size in a lightbox when clicked. Renders its own modal. */
export function ClickableShot({
  shot,
  className,
  sizes,
  device,
  bare,
}: {
  shot: Shot;
  className?: string;
  sizes?: string;
  device?: Device;
  /** Skip the default bordered frame — used inside containers that already draw their own border (e.g. the carousel). */
  bare?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const image = (
    <Image src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} className="h-auto w-full" sizes={sizes ?? '100vw'} />
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ampliar: ${shot.alt}`}
        className={`block w-full cursor-zoom-in text-left ${className ?? ''}`}
      >
        {device ? <DeviceChrome device={device}>{image}</DeviceChrome> : (
          <div className={`overflow-hidden transition-opacity hover:opacity-90 ${bare ? '' : 'border-2 border-[var(--l-fg)]'}`}>{image}</div>
        )}
      </button>
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={shot.alt}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 sm:p-8"
            onClick={() => setOpen(false)}
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.src} alt={shot.alt} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
          </div>,
          document.body
        )}
    </>
  );
}

/** Wraps a screenshot in a simple geometric device bezel matching the landing page's line-art style. */
function DeviceChrome({ device, children }: { device: Device; children: React.ReactNode }) {
  if (device === 'phone') {
    return (
      <div className="mx-auto max-w-[220px] rounded-[2.25rem] border-[10px] border-[var(--l-fg)] bg-[var(--l-fg)] shadow-xl">
        <div className="overflow-hidden rounded-[1.4rem]">{children}</div>
      </div>
    );
  }
  if (device === 'tablet') {
    return (
      <div className="mx-auto max-w-sm rounded-[1.5rem] border-[10px] border-[var(--l-fg)] bg-[var(--l-fg)] shadow-xl">
        <div className="overflow-hidden rounded-[0.6rem]">{children}</div>
      </div>
    );
  }
  // laptop
  return (
    <div className="shadow-xl">
      <div className="overflow-hidden rounded-t-lg border-2 border-b-0 border-[var(--l-fg)] bg-black p-1.5 sm:p-2">
        <div className="overflow-hidden rounded-sm">{children}</div>
      </div>
      <div
        className="h-3 border-2 border-t-0 border-[var(--l-fg)] bg-[var(--l-fg)] sm:h-4"
        style={{ clipPath: 'polygon(4% 0, 96% 0, 100% 100%, 0% 100%)' }}
      />
    </div>
  );
}

/**
 * Continuously scrolling carousel (CSS marquee, no step-then-pause jumps). Hovering (desktop) or
 * touching-and-holding (mobile) pauses the motion; a plain click/tap still opens the lightbox.
 */
export function FeatureCarousel({ shots }: { shots: (Shot & { caption: string })[] }) {
  const [paused, setPaused] = useState(false);
  const track = [...shots, ...shots];
  const durationSeconds = shots.length * 6;

  const pause = () => setPaused(true);
  const resume = () => setPaused(false);

  return (
    <div className="overflow-hidden border-2 border-[var(--l-fg)]" onMouseEnter={pause} onMouseLeave={resume} onTouchStart={pause} onTouchEnd={resume}>
      <div
        className="gg-marquee-track flex w-max"
        style={{ animationDuration: `${durationSeconds}s`, animationPlayState: paused ? 'paused' : 'running' }}
      >
        {track.map((s, i) => (
          <div key={`${s.src}-${i}`} className="w-[min(85vw,42rem)] shrink-0 px-2">
            <ClickableShot shot={s} bare sizes="(min-width: 640px) 42rem, 85vw" />
            <p className="mt-3 text-center text-sm font-bold sm:text-base">{s.caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

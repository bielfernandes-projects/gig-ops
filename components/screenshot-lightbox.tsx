'use client';

import { useEffect, useState } from 'react';
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
      {open && (
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
        </div>
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

/** Auto-advancing carousel: pauses on hover, and stays paused once the viewer interacts with it. */
export function FeatureCarousel({ shots }: { shots: (Shot & { caption: string })[] }) {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [interacted, setInteracted] = useState(false);

  useEffect(() => {
    if (hovering || interacted) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % shots.length), 4000);
    return () => clearInterval(id);
  }, [hovering, interacted, shots.length]);

  const stop = () => setInteracted(true);

  return (
    <div onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)} onClickCapture={stop}>
      <div className="overflow-hidden border-2 border-[var(--l-fg)]">
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {shots.map((s) => (
            <div key={s.src} className="w-full shrink-0">
              <ClickableShot shot={s} bare sizes="(min-width: 640px) 70vw, 100vw" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-sm font-bold sm:text-base">{shots[index].caption}</p>
        <div className="flex shrink-0 gap-2">
          {shots.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => {
                stop();
                setIndex(i);
              }}
              aria-label={`Ver ${s.caption}`}
              aria-current={i === index}
              className={`h-2.5 w-2.5 rounded-full border border-[var(--l-fg)] transition-colors ${i === index ? 'bg-[var(--l-fg)]' : 'bg-transparent'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

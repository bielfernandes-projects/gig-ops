'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ClickableShot, type Shot } from '@/components/screenshot-lightbox';

export type Slide = Shot & { caption: string; blurb: string };

/** Seconds a slide stays before moving on by itself. Slow on purpose: long enough to read the caption. */
const AUTOPLAY_MS = 9000;

/**
 * One screenshot at a time, with a caption, arrows and dots. It advances by itself every few seconds
 * while on screen, and stops for good at the first hover, focus, swipe or click (and never starts with
 * reduced motion). Slides are laid side by side and moved with `transform`.
 */
export function FeatureCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const last = slides.length - 1;

  const go = useCallback((i: number) => setIndex(Math.min(last, Math.max(0, i))), [last]);
  const step = useCallback((d: number) => setIndex((i) => (i + d + slides.length) % slides.length), [slides.length]);
  const takeOver = () => setAuto(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!auto || !visible || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => step(1), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [auto, visible, step, index]);

  return (
    <div
      ref={root}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Telas do Gigueiros"
      tabIndex={0}
      onMouseEnter={takeOver}
      onFocus={takeOver}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          takeOver();
          step(1);
        } else if (e.key === 'ArrowLeft') {
          takeOver();
          step(-1);
        }
      }}
      onTouchStart={(e) => {
        takeOver();
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
      }}
      className="outline-none"
    >
      <div className="overflow-hidden border-2 border-[var(--l-fg)]">
        <div className="flex transition-transform duration-700 ease-[var(--l-ease)] motion-reduce:transition-none" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((s, i) => (
            <div key={s.src} className="w-full shrink-0" aria-hidden={i !== index} inert={i !== index}>
              <ClickableShot shot={s} bare sizes="(min-width: 1152px) 1100px, 100vw" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-xl" aria-live="polite">
          <p className="text-xl font-bold tracking-[-0.02em] sm:text-2xl">{slides[index].caption}</p>
          <p className="mt-1 text-pretty text-base text-[var(--l-mute)]">{slides[index].blurb}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Tela anterior"
            onClick={() => {
              takeOver();
              step(-1);
            }}
            className="rounded-full border-2 border-[var(--l-fg)] p-2 transition-colors hover:bg-[var(--l-fg)] hover:text-[var(--l-bg)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Próxima tela"
            onClick={() => {
              takeOver();
              step(1);
            }}
            className="rounded-full border-2 border-[var(--l-fg)] p-2 transition-colors hover:bg-[var(--l-fg)] hover:text-[var(--l-bg)]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-2.5" role="tablist" aria-label="Escolher tela">
        {slides.map((s, i) => (
          <button
            key={s.src}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Ir para ${s.caption}`}
            onClick={() => {
              takeOver();
              go(i);
            }}
            className="group p-1.5"
          >
            <span
              className={`block h-3 w-3 rounded-full border-2 border-[var(--l-fg)] transition-transform duration-300 ${i === index ? 'scale-125 bg-[var(--l-fg)]' : 'bg-transparent group-hover:bg-[var(--l-line)]'}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

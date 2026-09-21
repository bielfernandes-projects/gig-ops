'use client';

import { useEffect, useRef } from 'react';

const ROWS = [
  { role: 'Voz', fee: 350 },
  { role: 'Violão', fee: 250 },
  { role: 'Bateria', fee: 250 },
  { role: 'Baixo', fee: 200 },
  { role: 'Som', fee: 300 },
];

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const total = ROWS.reduce((sum, r) => sum + r.fee, 0);

/**
 * A Saturday's lineup that gets marked "pago" line by line when it scrolls into view.
 * Content is fully readable without JS (final state); JS only arms the animation.
 */
export function Setlist() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rows = Array.from(root.querySelectorAll<HTMLElement>('.row'));
    const timers: number[] = [];
    root.dataset.armed = '1';

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        rows.forEach((row, i) =>
          timers.push(
            window.setTimeout(() => {
              row.dataset.paid = '1';
              if (i === rows.length - 1) root.dataset.done = '1';
            }, 800 + i * 520)
          )
        );
      },
      { threshold: 0.5 }
    );
    io.observe(root);

    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div
      ref={ref}
      className="setlist w-full max-w-md border-2 border-[var(--l-fg)] bg-[var(--l-card)] p-6 text-[var(--l-fg)] shadow-[8px_8px_0_var(--l-fg)] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] lg:-rotate-2 lg:hover:rotate-0 sm:p-7"
    >
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-dashed border-[var(--l-fg)] pb-4">
        <p className="whitespace-nowrap text-3xl font-black tracking-[-0.03em] sm:text-4xl">Sábado, 26</p>
        <p className="whitespace-nowrap text-sm text-[var(--l-mute)]">Casamento, 21h</p>
      </div>

      <ul className="divide-y divide-[var(--l-line)]">
        {ROWS.map((r) => (
          <li key={r.role} className="row flex items-center justify-between gap-3 py-3.5">
            <span className="text-lg font-bold">{r.role}</span>
            <span className="flex items-center gap-4">
              <span className="fee text-base tabular-nums font-medium transition-colors duration-300">{brl(r.fee)}</span>
              <span className="st text-xs font-bold">
                <span className="st-paid rounded-full bg-[var(--l-fg)] px-2.5 py-1 text-[var(--l-bg)]">pago</span>
                <span className="st-pend rounded-full border border-dashed border-[var(--l-mute)] px-2.5 py-1 text-[var(--l-mute)]">pendente</span>
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-baseline justify-between gap-4 border-t-2 border-[var(--l-fg)] pt-4">
        <span className="whitespace-nowrap text-sm font-medium text-[var(--l-mute)]">Cachês do show</span>
        <span className="tot inline-grid justify-items-end tabular-nums">
          <span className="tot-due whitespace-nowrap text-xl font-black">{brl(total)} a pagar</span>
          <span className="tot-done whitespace-nowrap text-xl font-black">{brl(total)} pagos</span>
        </span>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Keyboard, Clock } from 'lucide-react';

interface TimeDialModalProps {
  hour: number;
  minute: number;
  onConfirm: (hour: number, minute: number) => void;
  onCancel: () => void;
}

type Mode = 'hour' | 'minute' | 'keyboard';

const SIZE = 240;
const C = SIZE / 2;
const R_OUT = 96;
const R_IN = 62;
/** Share of the dial radius that splits the inner (13–00) ring from the outer (1–12) one. */
const INNER_SPLIT = 0.66;

const pad2 = (n: number) => String(n).padStart(2, '0');

function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
}

/**
 * Round clock face in the style of the Google Calendar picker: 24h, hours first (outer ring 1–12,
 * inner ring 13–00), then minutes (every minute is selectable by dragging, labels every 5), plus a
 * keyboard mode for typing. Dark-only on purpose: the app is dark and a native <select>/<input
 * type="time"> paints white popups on top of it.
 */
export function TimeDialModal({ hour, minute, onConfirm, onCancel }: TimeDialModalProps) {
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);
  const [mode, setMode] = useState<Mode>('hour');
  const [kbH, setKbH] = useState(pad2(hour));
  const [kbM, setKbM] = useState(pad2(minute));
  const [kbError, setKbError] = useState(false);

  const pick = (e: React.PointerEvent<HTMLDivElement>, finish: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (deg < 0) deg += 360;

    if (mode === 'hour') {
      const idx = Math.round(deg / 30) % 12;
      const inner = Math.hypot(dx, dy) < (rect.width / 2) * INNER_SPLIT;
      setH(inner ? (idx === 0 ? 0 : 12 + idx) : idx === 0 ? 12 : idx);
      if (finish) setMode('minute');
    } else {
      setM(Math.round(deg / 6) % 60);
    }
  };

  const confirm = () => {
    if (mode === 'keyboard') {
      const nh = Number(kbH);
      const nm = Number(kbM);
      if (!Number.isInteger(nh) || !Number.isInteger(nm) || nh < 0 || nh > 23 || nm < 0 || nm > 59 || !kbH || !kbM) {
        setKbError(true);
        return;
      }
      onConfirm(nh, nm);
      return;
    }
    onConfirm(h, m);
  };

  const toggleKeyboard = () => {
    if (mode === 'keyboard') {
      setMode('hour');
    } else {
      setKbH(pad2(h));
      setKbM(pad2(m));
      setKbError(false);
      setMode('keyboard');
    }
  };

  const hand =
    mode === 'hour'
      ? polar(h === 0 || h > 12 ? R_IN : R_OUT, (h % 12) * 30)
      : polar(R_OUT, m * 6);

  const digitBtn = (active: boolean) =>
    `rounded-lg px-3 py-2 text-4xl font-semibold tabular-nums transition-colors ${
      active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
    }`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Selecionar horário"
    >
      <div className="w-full max-w-[19rem] rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 text-xs font-medium text-zinc-400">Selecionar horário</p>

        {mode === 'keyboard' ? (
          <div className="flex items-center justify-center gap-2">
            <input
              inputMode="numeric"
              maxLength={2}
              value={kbH}
              onChange={(e) => { setKbH(e.target.value.replace(/\D/g, '')); setKbError(false); }}
              aria-label="Hora"
              className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 py-2 text-center text-4xl font-semibold tabular-nums text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
            <span className="text-4xl font-semibold text-zinc-500">:</span>
            <input
              inputMode="numeric"
              maxLength={2}
              value={kbM}
              onChange={(e) => { setKbM(e.target.value.replace(/\D/g, '')); setKbError(false); }}
              aria-label="Minuto"
              className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 py-2 text-center text-4xl font-semibold tabular-nums text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              <button type="button" onClick={() => setMode('hour')} className={digitBtn(mode === 'hour')} aria-label="Escolher a hora">{pad2(h)}</button>
              <span className="text-4xl font-semibold text-zinc-500">:</span>
              <button type="button" onClick={() => setMode('minute')} className={digitBtn(mode === 'minute')} aria-label="Escolher o minuto">{pad2(m)}</button>
            </div>

            <div
              className="relative mx-auto mt-5 touch-none select-none rounded-full bg-zinc-800"
              style={{ width: SIZE, height: SIZE, maxWidth: '100%' }}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e, false); }}
              onPointerMove={(e) => { if (e.buttons) pick(e, false); }}
              onPointerUp={(e) => pick(e, true)}
            >
              <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
                <line x1={C} y1={C} x2={hand.x} y2={hand.y} stroke="#10b981" strokeWidth={2} />
                <circle cx={C} cy={C} r={3} fill="#10b981" />
                <circle cx={hand.x} cy={hand.y} r={16} fill="#10b981" />
                {mode === 'minute' && m % 5 !== 0 && <circle cx={hand.x} cy={hand.y} r={2.5} fill="#09090b" />}

                {mode === 'hour' &&
                  Array.from({ length: 12 }).map((_, i) => {
                    const k = i + 1;
                    const outer = polar(R_OUT, k * 30);
                    const inner = polar(R_IN, k * 30);
                    const innerVal = k === 12 ? 0 : 12 + k;
                    return (
                      <g key={k} className="pointer-events-none text-[13px] font-medium">
                        <text x={outer.x} y={outer.y} textAnchor="middle" dominantBaseline="central" fill={h === k ? '#09090b' : '#e4e4e7'}>{k}</text>
                        <text x={inner.x} y={inner.y} textAnchor="middle" dominantBaseline="central" fontSize={11} fill={h === innerVal ? '#09090b' : '#a1a1aa'}>{pad2(innerVal)}</text>
                      </g>
                    );
                  })}

                {mode === 'minute' &&
                  Array.from({ length: 12 }).map((_, i) => {
                    const val = i * 5;
                    const p = polar(R_OUT, val * 6);
                    return (
                      <text key={val} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className="pointer-events-none text-[13px] font-medium" fill={m === val ? '#09090b' : '#e4e4e7'}>
                        {pad2(val)}
                      </text>
                    );
                  })}
              </svg>
            </div>
          </>
        )}

        {kbError && <p className="mt-3 text-center text-xs font-medium text-amber-500/80">Use uma hora de 00 a 23 e minutos de 00 a 59.</p>}

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={toggleKeyboard}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            aria-label={mode === 'keyboard' ? 'Voltar ao relógio' : 'Digitar o horário'}
            title={mode === 'keyboard' ? 'Voltar ao relógio' : 'Digitar o horário'}
          >
            {mode === 'keyboard' ? <Clock className="h-5 w-5" /> : <Keyboard className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100">
              Cancelar
            </button>
            <button type="button" onClick={confirm} className="rounded-lg px-3 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-zinc-800">
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

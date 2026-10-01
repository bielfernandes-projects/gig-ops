'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { brl, brlRound } from '@/lib/finance';

const TOOLTIP_STYLE = { backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.5rem', fontSize: '0.875rem' };

function Empty({ text }: { text: string }) {
  return (
    <div className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 py-16">
      <p className="text-sm font-medium text-zinc-500">{text}</p>
    </div>
  );
}

/** Rosca de valores por projeto, no mesmo estilo do gráfico do Dashboard. */
export function ProjectPie({ title, totalLabel, data, emptyText }: { title: string; totalLabel: string; data: { name: string; value: number; color: string }[]; emptyText: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-200">{title}</h2>
      {data.length === 0 ? (
        <Empty text={emptyText} />
      ) : (
        <div className="relative h-[300px]" role="img" aria-label={`Gráfico de pizza: ${title}. ${totalLabel}: ${brl(total)}`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="46%" innerRadius={68} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: unknown) => brl(typeof v === 'number' ? v : 0)} contentStyle={TOOLTIP_STYLE} itemStyle={{ fontWeight: 'bold' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-x-0 top-[46%] flex -translate-y-1/2 flex-col items-center">
            <span className="text-xs font-medium text-zinc-500">{totalLabel}</span>
            <span className="mt-1 text-xl font-bold leading-none text-zinc-100">{brlRound(total)}</span>
          </div>
        </div>
      )}
    </section>
  );
}

/** Gigs por projeto ao longo dos meses, com os mesmos botões de filtro do Dashboard. */
export function ProjectLine({ title, data, projects, emptyText }: { title: string; data: Record<string, string | number>[]; projects: { name: string; color: string }[]; emptyText: string }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (name: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-200">{title}</h2>
      {projects.length === 0 ? (
        <Empty text={emptyText} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {projects.map(({ name, color }) => (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${hidden.has(name) ? 'border-zinc-800 bg-zinc-950 text-zinc-500 opacity-50 hover:opacity-80' : 'border-zinc-700 bg-zinc-800 text-zinc-100'}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {name}
              </button>
            ))}
          </div>
          <div className="h-[260px]" role="img" aria-label={`Gráfico de linha: ${title}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ fontWeight: 'bold' }} />
                {projects.map(({ name, color }) =>
                  hidden.has(name) ? null : <Line key={name} type="monotone" dataKey={name} name={name} stroke={color} strokeWidth={2} dot={{ r: 4, fill: '#09090b', strokeWidth: 2 }} activeDot={{ r: 6 }} />,
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}

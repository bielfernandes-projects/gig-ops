/**
 * Número de destaque do painel. É uma stat tile, não um gráfico: quando a resposta é um número só,
 * desenhar eixo em volta dele é ruído.
 */
export function AdminStatCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'good' | 'warning';
}) {
  const valueTone =
    tone === 'good' ? 'text-emerald-400' : tone === 'warning' ? 'text-amber-300' : 'text-zinc-50';

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueTone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

/**
 * Contagem por dia numa janela fechada de N dias. Barras (não linha) porque são contagens discretas
 * e a maioria dos dias é zero — uma linha ligando zeros inventa tendência que não existe.
 * Dias sem nada chegam preenchidos com zero por quem chama, pra o eixo do tempo não ter buraco.
 */
export function AdminDailyBars({
  title,
  data,
  unit,
}: {
  title: string;
  data: { day: string; total: number }[];
  unit: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const total = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-sm font-bold text-zinc-100">{title}</h2>
      <p className="mt-0.5 mb-4 text-xs text-zinc-500">
        {total} {unit} em 30 dias · pico de {max} num dia
      </p>

      <div className="flex h-28 items-stretch gap-[2px]">
        {data.map((d) => (
          <div key={d.day} className="group relative flex flex-1 flex-col justify-end">
            <span
              className="w-full rounded-t-[4px] bg-emerald-600 transition-colors group-hover:bg-emerald-500"
              style={{ height: d.total === 0 ? '0' : `max(3px, ${Math.round((d.total / max) * 100)}%)` }}
            />
            {/* Tooltip por marca, sem JavaScript: o valor de cada dia fica alcançável no hover. */}
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[11px] font-medium text-zinc-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {formatDay(d.day)} · {d.total}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 h-px bg-zinc-800" />
      <div className="mt-1.5 flex justify-between text-[10px] text-zinc-600">
        <span>{formatDay(data[0]?.day)}</span>
        <span>{formatDay(data[data.length - 1]?.day)}</span>
      </div>
    </section>
  );
}

/**
 * 'YYYY-MM-DD' montado como data local. `new Date('2026-09-12')` é meia-noite UTC e, no fuso do
 * Brasil, voltaria um dia — o rótulo mostraria 11/09 pra um cadastro do dia 12.
 */
function formatDay(iso: string | undefined): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

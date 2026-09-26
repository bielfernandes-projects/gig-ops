/**
 * Ranking de magnitude (telas ou ações mais usadas). Barras horizontais com o valor sempre visível:
 * série única, então não há legenda — o título já diz o que é — e o número ao lado dispensa
 * depender de cor pra ler o dado.
 */
export function AdminBarList({
  title,
  subtitle,
  rows,
  empty,
}: {
  title: string;
  subtitle: string;
  rows: { name: string; total: number; users: number }[];
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-sm font-bold text-zinc-100">{title}</h2>
      <p className="mt-0.5 mb-4 text-xs text-zinc-500">{subtitle}</p>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-zinc-600">{empty}</p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <li key={row.name} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3">
              <span className="truncate font-mono text-xs text-zinc-300" title={row.name}>
                {row.name}
              </span>
              <span className="h-2.5 overflow-hidden rounded-[4px] bg-zinc-800">
                <span
                  className="block h-full rounded-[4px] bg-emerald-600"
                  style={{ width: `${Math.max(2, Math.round((row.total / max) * 100))}%` }}
                />
              </span>
              <span className="text-xs tabular-nums text-zinc-400">
                <strong className="font-semibold text-zinc-200">{row.total}</strong>
                <span className="text-zinc-600"> · {row.users} {row.users === 1 ? 'pessoa' : 'pessoas'}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

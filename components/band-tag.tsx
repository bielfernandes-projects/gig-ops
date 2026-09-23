/** Which band a record belongs to — only rendered in the "Todas as bandas" view. */
export function BandTag({ name, className = '' }: { name: string | null | undefined; className?: string }) {
  if (!name) return null;
  return (
    <span className={`inline-flex max-w-[160px] items-center truncate rounded-full border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 ${className}`}>
      {name}
    </span>
  );
}

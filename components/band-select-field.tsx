export type BandChoice = { bandId: string; name: string };

/**
 * `band_id` field for create forms. With a single band it is a hidden input; with several
 * (the "Todas as bandas" view) the person picks which band the new record belongs to.
 */
export function BandSelectField({ bands, defaultValue }: { bands: BandChoice[]; defaultValue?: string }) {
  if (bands.length === 0) return null;
  if (bands.length === 1) return <input type="hidden" name="band_id" value={bands[0].bandId} />;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="band_id" className="text-xs font-medium text-zinc-400">
        Banda <span className="text-red-400">*</span>
      </label>
      <select
        id="band_id"
        name="band_id"
        required
        defaultValue={defaultValue ?? bands[0].bandId}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
      >
        {bands.map((b) => (
          <option key={b.bandId} value={b.bandId}>{b.name}</option>
        ))}
      </select>
    </div>
  );
}

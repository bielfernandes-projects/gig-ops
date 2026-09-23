import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserInfo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CatalogClient, type CatalogSong } from '@/components/catalog-client';
import { PersonalSetlists } from '@/components/personal-setlists';
import { BandSwitcher } from '@/components/band-switcher';
import { BandTag } from '@/components/band-tag';

export const revalidate = 0;

const TZ = 'America/Sao_Paulo';

export default async function RepertorioPage() {
  const info = await getUserInfo();
  if (!info.userId) redirect('/login');
  if (info.memberships.length === 0) redirect('/onboarding');

  // Only bands (in the current view) whose plan includes the module.
  const repBandIds = info.bandIds.filter((id) => info.bands[id]?.modules.repertorio);
  const nameOf = (bandId: string) => info.bands[bandId]?.name ?? 'Banda';

  if (repBandIds.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-zinc-50">Repertório</h1>
        <p className="mt-3 text-sm text-zinc-400">O módulo de repertório não está incluído no plano desta banda.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [songsResult, gigsResult, personalResult] = await Promise.all([
    supabase
      .from('songs')
      .select('id, title, artist, original_key, bpm, source_url, chart_text, pdf_path, created_by, scope, band_id')
      .in('band_id', repBandIds)
      .order('title', { ascending: true }),
    supabase
      .from('go_gigs')
      .select('id, title, start_time, band_id, setlists(id)')
      .in('band_id', repBandIds)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(8),
    supabase
      .from('setlists')
      .select('id, name, band_id')
      .in('band_id', repBandIds)
      .eq('scope', 'personal')
      .eq('owner_user_id', info.userId)
      .order('created_at', { ascending: false }),
  ]);

  const songs = (songsResult.data ?? []) as (CatalogSong & { band_id: string })[];
  const personalLists = ((personalResult.data ?? []) as { id: string; name: string; band_id: string }[]).map((l) => ({
    id: l.id,
    name: l.name,
    bandName: info.allBands ? nameOf(l.band_id) : undefined,
  }));
  const gigs = (gigsResult.data ?? []) as unknown as { id: string; title: string; start_time: string; band_id: string; setlists: { id: string }[] | null }[];

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 pb-32 md:p-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">Repertório</h1>
          <p className="mt-1 text-sm text-zinc-400">{info.bandName}: catálogo da banda e repertório de cada show.</p>
        </div>
        <BandSwitcher memberships={info.memberships} currentBandId={info.bandId} />
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Repertório dos próximos shows</h2>
        {gigs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">Nenhum show futuro.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900">
            {gigs.map((g) => {
              const has = (g.setlists ?? []).length > 0;
              return (
                <li key={g.id}>
                  <Link href={`/gigs/${g.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-zinc-800/40">
                    <span className="flex min-w-0 items-center gap-2 text-zinc-200">
                      <span className="truncate">
                        {new Date(g.start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: TZ })} · {g.title}
                      </span>
                      {info.allBands && <BandTag name={nameOf(g.band_id)} />}
                    </span>
                    <span className={`shrink-0 text-xs font-semibold ${has ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {has ? 'Com repertório' : info.bands[g.band_id]?.role === 'admin' ? 'Criar repertório' : 'Sem repertório'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PersonalSetlists lists={personalLists} bands={repBandIds.map((id) => ({ bandId: id, name: nameOf(id) }))} />

      {/* One catalog per band: each band keeps its own songs, and new songs go to that band. */}
      <div className="flex flex-col gap-10">
        {repBandIds.map((bandId) => {
          const bandSongs = songs.filter((s) => s.band_id === bandId);
          return (
            <div key={bandId}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-zinc-200">
                  Catálogo {info.allBands ? `· ${nameOf(bandId)}` : 'da banda'}
                </h2>
                <span className="text-xs text-zinc-500">{bandSongs.length} {bandSongs.length === 1 ? 'música' : 'músicas'}</span>
              </div>
              <CatalogClient songs={bandSongs} userId={info.userId!} isOwner={info.bands[bandId]?.role === 'admin'} bandId={bandId} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

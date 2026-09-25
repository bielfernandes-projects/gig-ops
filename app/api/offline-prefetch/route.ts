import { NextResponse } from 'next/server';
import { getUserInfo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

/** URLs of the current user's next shows (gig + repertoire pages), for the client to warm the offline cache with. */
export async function GET() {
  const info = await getUserInfo();
  if (info.bandIds.length === 0) return NextResponse.json({ urls: [] });
  const supabase = await createClient();

  const { data: gigs } = await supabase
    .from('go_gigs')
    .select('id, band_id, setlist_id')
    .in('band_id', info.bandIds)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(15);

  const list = (gigs ?? []) as { id: string; band_id: string; setlist_id: string | null }[];
  // Owners get every upcoming show of their band; musicians only the ones they're in.
  const memberIds = info.bandIds.map((id) => info.bands[id]?.memberId).filter((m): m is string => !!m);
  const toCheck = list.filter((g) => info.bands[g.band_id]?.role !== 'admin').map((g) => g.id);
  let mine = new Set<string>();
  if (toCheck.length > 0 && memberIds.length > 0) {
    const { data: lineup } = await supabase.from('go_lineup').select('gig_id').in('member_id', memberIds).in('gig_id', toCheck);
    mine = new Set((lineup ?? []).map((l) => l.gig_id as string));
  }
  const relevant = list.filter((g) => info.bands[g.band_id]?.role === 'admin' || mine.has(g.id));
  const setlistIds = [...new Set(relevant.map((g) => g.setlist_id).filter((id): id is string => !!id))];

  const urls = [...relevant.map((g) => `/gigs/${g.id}`), ...setlistIds.map((id) => `/repertorio/lista/${id}`)];

  return NextResponse.json({ urls });
}

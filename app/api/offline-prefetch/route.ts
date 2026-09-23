import { NextResponse } from 'next/server';
import { getUserInfo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

/** URLs of the current user's next shows (gig + palco pages), for the client to warm the offline cache with. */
export async function GET() {
  const info = await getUserInfo();
  if (!info.bandId) return NextResponse.json({ urls: [] });
  const supabase = await createClient();

  const { data: gigs } = await supabase
    .from('go_gigs')
    .select('id')
    .eq('band_id', info.bandId)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(15);

  let gigIds = (gigs ?? []).map((g) => g.id as string);

  if (info.role !== 'admin' && info.memberId && gigIds.length > 0) {
    const { data: lineup } = await supabase.from('go_lineup').select('gig_id').eq('member_id', info.memberId).in('gig_id', gigIds);
    const allowed = new Set((lineup ?? []).map((l) => l.gig_id as string));
    gigIds = gigIds.filter((id) => allowed.has(id));
  }

  const { data: setlists } = gigIds.length > 0 ? await supabase.from('setlists').select('id').in('gig_id', gigIds) : { data: [] };

  const urls = [...gigIds.map((id) => `/gigs/${id}`), ...(setlists ?? []).map((s) => `/palco/${s.id as string}`)];

  return NextResponse.json({ urls });
}

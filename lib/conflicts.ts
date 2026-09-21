import { createAdminClient } from '@/lib/supabase/admin';

const DEFAULT_GIG_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const endOf = (start: string, end: string | null) => (end ? new Date(end) : new Date(new Date(start).getTime() + DEFAULT_GIG_MS));

/**
 * People can play in several bands, so a musician can be double-booked. Returns, per musician,
 * warnings about shows overlapping this gig (same band: with the title; other bands: only that
 * there is a commitment, so one band never sees another band's details).
 */
export async function findConflicts(gigId: string, memberIds: string[]): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};
  if (memberIds.length === 0) return result;

  const admin = createAdminClient();
  const { data: gig } = await admin.from('go_gigs').select('id, start_time, end_time, band_id').eq('id', gigId).maybeSingle();
  if (!gig) return result;

  const gigStart = new Date(gig.start_time);
  const gigEnd = endOf(gig.start_time, gig.end_time);

  const { data: targets } = await admin.from('go_members').select('id, name, user_id, email').in('id', memberIds);
  if (!targets || targets.length === 0) return result;

  // every roster row that is the same person (same account or same e-mail), in any band
  const userIds = [...new Set(targets.map((t) => t.user_id).filter(Boolean))] as string[];
  const emails = [...new Set(targets.map((t) => t.email).filter(Boolean).flatMap((e) => [e as string, (e as string).toLowerCase()]))];

  const sameByUser = userIds.length ? await admin.from('go_members').select('id, user_id, email').in('user_id', userIds) : { data: [] };
  const sameByEmail = emails.length ? await admin.from('go_members').select('id, user_id, email').in('email', emails) : { data: [] };
  const roster = new Map<string, { id: string; user_id: string | null; email: string | null }>();
  for (const r of [...(sameByUser.data ?? []), ...(sameByEmail.data ?? [])]) roster.set(r.id, r);

  const identity = (r: { user_id: string | null; email: string | null }) => r.user_id ?? (r.email ? r.email.toLowerCase() : null);

  const windowStart = new Date(gigStart.getTime() - DAY_MS).toISOString();
  const windowEnd = new Date(gigEnd.getTime() + DAY_MS).toISOString();

  const { data: bookings } = await admin
    .from('go_lineup')
    .select('member_id, go_gigs!inner(id, title, start_time, end_time, band_id)')
    .in('member_id', [...roster.keys()])
    .neq('go_gigs.id', gigId)
    .gte('go_gigs.start_time', windowStart)
    .lte('go_gigs.start_time', windowEnd);

  type Booking = { member_id: string; go_gigs: { id: string; title: string; start_time: string; end_time: string | null; band_id: string } | { id: string; title: string; start_time: string; end_time: string | null; band_id: string }[] };

  for (const target of targets) {
    const key = identity(target);
    if (!key) continue;

    const warnings: string[] = [];
    for (const b of (bookings ?? []) as unknown as Booking[]) {
      const owner = roster.get(b.member_id);
      if (!owner || identity(owner) !== key) continue;

      const other = Array.isArray(b.go_gigs) ? b.go_gigs[0] : b.go_gigs;
      if (!other) continue;
      const overlaps = new Date(other.start_time) < gigEnd && endOf(other.start_time, other.end_time) > gigStart;
      if (!overlaps) continue;

      warnings.push(
        other.band_id === gig.band_id
          ? `${target.name} já está escalado(a) em "${other.title}" neste horário.`
          : `${target.name} já tem outro compromisso neste horário, em outra banda.`
      );
    }
    if (warnings.length) result[target.id] = [...new Set(warnings)];
  }

  return result;
}

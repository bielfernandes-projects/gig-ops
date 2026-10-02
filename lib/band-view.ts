/** Band-filter value for the consolidated "all my bands" view. Client-safe (no server imports). */
export const ALL_BANDS = 'all';

/** Per-band role of the viewer, keyed by band id — what client components need to decide per record. */
export type BandRoles = Record<string, { name: string; role: 'admin' | 'viewer'; memberId: string | null }>;

/**
 * For what the person sees on the Agenda and Dashboard, the owner of a Freela account is a musician on
 * every gig of it (never "the Dono who pays a crew"): their cachê and what they still have to receive.
 */
export function toBandRoles(bands: Record<string, { name: string; role: 'admin' | 'viewer'; memberId: string | null; kind?: 'banda' | 'freela' }>): BandRoles {
  return Object.fromEntries(Object.entries(bands).map(([id, b]) => [id, { name: b.name, role: b.kind === 'freela' ? 'viewer' : b.role, memberId: b.memberId }]));
}

export const isOwnerOf = (roles: BandRoles, bandId: string | null | undefined) => !!bandId && roles[bandId]?.role === 'admin';
export const myMemberIdIn = (roles: BandRoles, bandId: string | null | undefined) => (bandId ? roles[bandId]?.memberId ?? null : null);

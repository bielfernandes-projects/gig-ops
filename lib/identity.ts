/**
 * "Is this `go_members` row the same person as this account?"
 *
 * A musician plays in several Bandas, and each Banda has its own roster row for them — sometimes
 * linked to their account (`user_id`), sometimes only to the e-mail the Dono typed when adding them.
 * So identity is "same account, or same e-mail", and e-mail is compared case-folded: a Dono who
 * types `Joao@Gmail.com` must not create a second, invisible person.
 *
 * This rule used to exist in four places — two of them case-sensitive, two not — so the same person
 * was "me" on one screen and a stranger on another.
 *
 * Client-safe: no server imports.
 */

/** The account asking the question. */
export type Viewer = { userId: string | null; email?: string | null };

/** A roster row, as far as identity is concerned. */
export type Participant = { user_id?: string | null; email?: string | null };

const fold = (email: string | null | undefined) => email?.trim().toLowerCase() || null;

/**
 * A key for one human: their account id when the row is linked, otherwise their folded e-mail. Rows
 * with neither are anonymous ("avulsos") and never match anybody.
 *
 * Only for grouping rows that all come from the same source. Across Bandas use `sameHuman`: two rows
 * for one person can differ in whether they are linked to the account, which this key cannot see.
 */
export function identityKey(row: Participant): string | null {
  return row.user_id ?? fold(row.email);
}

/**
 * Whether two roster rows are the same human. The account id and the e-mail are two independent
 * ways to match, because one Banda may have linked the person to their account while another only
 * ever had their e-mail — comparing a single "best" key per row would split them in two.
 */
export function sameHuman(a: Participant, b: Participant): boolean {
  if (a.user_id && b.user_id && a.user_id === b.user_id) return true;
  const email = fold(a.email);
  return email !== null && email === fold(b.email);
}

/** Whether a roster row is the viewer. */
export function isViewer(row: Participant, viewer: Viewer): boolean {
  if (!viewer.userId) return false;
  return sameHuman(row, { user_id: viewer.userId, email: viewer.email ?? null });
}

/**
 * The PostgREST `or()` filter that finds the viewer's roster rows: their account, or their e-mail.
 *
 * The e-mail is wrapped in double quotes because it contains `.` and `@`, which PostgREST would
 * otherwise read as filter syntax; any `"` or `\` inside it is escaped so a crafted address cannot
 * break out of the value. Returns just the `user_id` clause when the account has no e-mail.
 */
export function memberRowsFilter(viewer: Viewer): string {
  const byUser = `user_id.eq.${viewer.userId}`;
  const email = fold(viewer.email);
  if (!email) return byUser;
  const quoted = email.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `${byUser},email.eq."${quoted}"`;
}

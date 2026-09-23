import { createAdminClient } from '../../lib/supabase/admin.ts';

/**
 * Grants free "premium" access (no payment) to bands owned by the given emails — for
 * friends/testers. Sets the band's subscription to active with no expiry.
 *
 * Usage: node --env-file=.env supabase/scripts/grant-free-access.ts email1@x.com email2@y.com
 */
async function main() {
  const emails = process.argv.slice(2).map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) {
    console.error('Uso: node --env-file=.env supabase/scripts/grant-free-access.ts email1@x.com [email2@y.com ...]');
    process.exit(1);
  }

  const admin = createAdminClient();

  // listUsers() doesn't filter by email server-side, so we page through and match locally.
  const users: { id: string; email?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) break;
  }

  for (const email of emails) {
    const user = users.find((u) => u.email?.toLowerCase() === email);
    if (!user) {
      console.error(`✗ ${email}: nenhuma conta encontrada (a pessoa ainda não fez login/cadastro).`);
      continue;
    }

    const { data: memberships, error: memberError } = await admin
      .from('band_members')
      .select('band_id, bands(name)')
      .eq('user_id', user.id)
      .eq('role', 'owner');
    if (memberError) throw memberError;

    if (!memberships || memberships.length === 0) {
      console.error(`✗ ${email}: conta existe, mas não é dona de nenhuma banda ainda (falta criar a banda no onboarding).`);
      continue;
    }

    for (const m of memberships) {
      const { error: updateError } = await admin.from('subscriptions').update({ status: 'active', paid_until: null }).eq('band_id', m.band_id);
      if (updateError) throw updateError;
      const bandName = Array.isArray(m.bands) ? m.bands[0]?.name : (m.bands as { name: string } | null)?.name;
      console.log(`✓ ${email}: banda "${bandName ?? m.band_id}" liberada sem cobrança.`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

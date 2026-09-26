import { createAdminClient } from '../../lib/supabase/admin.ts';

/**
 * Grants free "premium" access (no payment) to bands owned by the given emails — for
 * friends/testers. Sets the band's subscription to active with no expiry.
 *
 * The same thing is a button in the admin panel (/admin/usuarios), which is the normal path now;
 * this stays for doing several e-mails at once without logging in. Both skip bands that pay through
 * Stripe, for the same reason: the next webhook event would undo the change anyway.
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
      const bandName = Array.isArray(m.bands) ? m.bands[0]?.name : (m.bands as { name: string } | null)?.name;
      const label = bandName ?? m.band_id;

      // Banda que paga pelo Stripe fica de fora: syncSubscription desfaria isso no próximo evento,
      // e no meio-tempo o painel mostraria um estado que o Stripe não conhece.
      const { data: sub } = await admin.from('subscriptions').select('stripe_subscription_id').eq('band_id', m.band_id).maybeSingle();
      if (sub?.stripe_subscription_id) {
        console.error(`✗ ${email}: banda "${label}" tem assinatura no Stripe — cancele pelo portal, não por aqui.`);
        continue;
      }

      const { error: updateError } = await admin.from('subscriptions').update({ status: 'active', paid_until: null }).eq('band_id', m.band_id);
      if (updateError) throw updateError;
      console.log(`✓ ${email}: banda "${label}" liberada sem cobrança.`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = new Date().toISOString();

  // Find all unsent reminders that are due
  const { data: dueReminders, error: fetchError } = await supabase
    .from('go_reminders')
    .select(`
      id,
      gig_id,
      go_gigs (
        id,
        title,
        start_time,
        go_projects ( name )
      )
    `)
    .eq('sent', false)
    .lte('remind_at', now)
    .limit(50);

  if (fetchError) {
    console.error('Error fetching reminders:', fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!dueReminders || dueReminders.length === 0) {
    return NextResponse.json({ message: 'No due reminders', count: 0 });
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const reminder of dueReminders) {
    const gigArray = reminder.go_gigs as unknown as { id: string; title: string; start_time: string; go_projects: { name: string } | { name: string }[] | null }[] | null;
    const gig = Array.isArray(gigArray) ? gigArray[0] : gigArray;
    if (!gig) {
      // Gig was deleted, mark reminder as sent to skip
      await supabase.from('go_reminders').update({ sent: true }).eq('id', reminder.id);
      continue;
    }

    const projectName = Array.isArray(gig.go_projects)
      ? gig.go_projects[0]?.name
      : gig.go_projects?.name;

    const gigDate = new Date(gig.start_time);
    const dateStr = gigDate.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      timeZone: 'America/Sao_Paulo',
    });
    const timeStr = gigDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });

    // Find all lineup members for this gig
    const { data: lineupMembers } = await supabase
      .from('go_lineup')
      .select('member_id')
      .eq('gig_id', reminder.gig_id);

    if (!lineupMembers || lineupMembers.length === 0) {
      await supabase.from('go_reminders').update({ sent: true }).eq('id', reminder.id);
      continue;
    }

    const memberIds = [...new Set(lineupMembers.map(l => l.member_id).filter(Boolean))] as string[];

    // Send push to each member
    for (const memberId of memberIds) {
      try {
        // Get member email
        const { data: member } = await supabase
          .from('go_members')
          .select('email')
          .eq('id', memberId)
          .single();

        if (!member?.email) continue;

        // Find profile
        const { data: profile } = await supabase
          .from('go_profiles')
          .select('id')
          .eq('email', member.email)
          .single();

        if (!profile?.id) continue;

        // Get push subscriptions
        const { data: subscriptions } = await supabase
          .from('go_push_subscriptions')
          .select('subscription_json')
          .eq('user_id', profile.id);

        if (!subscriptions || subscriptions.length === 0) continue;

        const title = projectName
          ? `${gig.title} [${projectName}]`
          : gig.title;

        const payload = JSON.stringify({
          title: `Lembrete: ${title}`,
          body: `${dateStr} as ${timeStr}. Nao esqueca!`,
          url: `/gigs/${gig.id}`,
        });

        // Send to all subscriptions
        const webpush = (await import('web-push')).default;
        webpush.setVapidDetails(
          process.env.VAPID_ADMIN_EMAIL || 'mailto:admin@minhabanda.app',
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          process.env.VAPID_PRIVATE_KEY!
        );

        await Promise.allSettled(
          subscriptions.map(async (row) => {
            try {
              const sub = JSON.parse(row.subscription_json);
              await webpush.sendNotification(sub, payload);
      } catch {
        // Remove expired subscription
        await supabase
                .from('go_push_subscriptions')
                .delete()
                .eq('subscription_json', row.subscription_json);
            }
          })
        );

        sentCount++;
      } catch (err) {
        console.warn(`Failed to send reminder to member ${memberId}:`, err);
        failedCount++;
      }
    }

    // Mark reminder as sent
    await supabase.from('go_reminders').update({ sent: true }).eq('id', reminder.id);
  }

  return NextResponse.json({
    message: 'Reminders processed',
    total: dueReminders.length,
    sent: sentCount,
    failed: failedCount,
  });
}

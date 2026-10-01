import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToAll } from '@/lib/push';
import { UPDATE_PUSH_TITLE, updatePushBody } from '@/lib/update-push';

export const dynamic = 'force-dynamic';

/**
 * Chamado todo dia às 8h (Brasília) por um agendador externo. Se alguma atualização do app foi lançada
 * e ainda não foi avisada, manda UM push a todos os aparelhos e marca todas como avisadas.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Reivindica as pendentes numa só instrução: se o agendador disparar duas vezes ao mesmo tempo,
  // só uma das chamadas recebe linhas de volta e só ela envia.
  const { data: claimed, error } = await createAdminClient()
    .from('app_updates')
    .update({ push_sent_at: new Date().toISOString() })
    .is('push_sent_at', null)
    .select('id');

  if (error) {
    console.error('updates-push: falha ao reivindicar atualizações pendentes:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!claimed || claimed.length === 0) return NextResponse.json({ updates: 0, devices: 0 });

  const devices = await sendPushToAll({ title: UPDATE_PUSH_TITLE, body: updatePushBody(), url: '/dashboard' });
  return NextResponse.json({ updates: claimed.length, devices });
}

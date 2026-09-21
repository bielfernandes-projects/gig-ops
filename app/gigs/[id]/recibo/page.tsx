import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserInfo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { brl } from '@/lib/finance';
import { reaisPorExtenso } from '@/lib/extenso';
import { PrintButton } from '@/components/print-button';

export const revalidate = 0;

const TZ = 'America/Sao_Paulo';

/** Printable receipt for a gig (owners only). "?p=<payment id>" issues it for one specific payment. */
export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string }> }) {
  const { id } = await params;
  const { p: paymentId } = await searchParams;
  const info = await getUserInfo();
  if (!info.userId) redirect('/login');
  if (info.role !== 'admin' || !info.bandId) redirect(`/gigs/${id}`);

  const supabase = await createClient();
  const [{ data: gig }, { data: payments }] = await Promise.all([
    supabase.from('go_gigs').select('id, title, start_time, location, gross_value, client_name, track_receipts').eq('id', id).eq('band_id', info.bandId).maybeSingle(),
    supabase.from('gig_payments').select('id, amount, paid_at, note').eq('gig_id', id).order('paid_at'),
  ]);

  if (!gig) redirect('/agenda');

  const list = (payments ?? []).map((p) => ({ ...p, amount: Number(p.amount) }));
  const single = paymentId ? list.find((p) => p.id === paymentId) : undefined;
  const received = gig.track_receipts ? list.reduce((s, p) => s + p.amount, 0) : Number(gig.gross_value);
  const amount = single ? single.amount : received;
  const partial = !!single && single.amount < Number(gig.gross_value);

  const showDate = new Date(gig.start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: TZ });
  const paidOn = single ? new Date(`${single.paid_at}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;
  const issuedOn = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: TZ });
  const extenso = reaisPorExtenso(amount);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 pb-32 md:p-10 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/gigs/${id}`} className="text-sm font-medium text-zinc-400 hover:text-zinc-100">← Voltar ao show</Link>
        <PrintButton />
      </div>

      {amount <= 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-400 print:hidden">
          Ainda não há valor recebido registrado para este show. Registre o recebimento na página do show para emitir o recibo.
        </p>
      ) : (
        <article className="rounded-xl bg-white p-8 text-black shadow-sm md:p-12 print:rounded-none print:p-0 print:shadow-none">
          <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">{info.bandName}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Recibo</h1>
          <p className="mt-6 text-3xl font-black tabular-nums">{brl(amount)}</p>

          <p className="mt-8 text-lg leading-relaxed">
            Recebemos de <strong>{gig.client_name || '______________________________'}</strong> a quantia de{' '}
            <strong>{brl(amount)}</strong>
            {extenso ? ` (${extenso})` : ''}
            {partial ? ', referente ao pagamento parcial (sinal ou parcela)' : ', referente ao pagamento'} da apresentação musical{' '}
            <strong>{gig.title}</strong>, realizada em <strong>{showDate}</strong>
            {gig.location && gig.location !== 'A definir' ? `, em ${gig.location}` : ''}.
          </p>
          {partial && (
            <p className="mt-3 text-sm text-zinc-600">
              Valor total do cachê combinado: {brl(Number(gig.gross_value))}
              {paidOn ? `. Pagamento recebido em ${paidOn}.` : '.'}
            </p>
          )}

          <p className="mt-10 text-sm text-zinc-600">Para maior clareza, firmo o presente recibo, dando plena quitação do valor acima.</p>

          <div className="mt-16 flex flex-wrap items-end justify-between gap-8 text-sm">
            <p className="text-zinc-600">{issuedOn}</p>
            <div className="w-64 border-t border-black pt-2 text-center">
              <p className="font-semibold">{info.bandName}</p>
              <p className="text-xs text-zinc-500">Assinatura do responsável</p>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

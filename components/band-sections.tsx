'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Crown, Users, UserMinus, PenLine, X, ShieldCheck, ShieldOff, LogOut, MessageCircle } from 'lucide-react';
import {
  saveInviteCode,
  renameBand,
  setMemberRole,
  removeMember,
  leaveBand,
  joinAnotherBand,
  createAnotherBand,
  switchBand,
  setProfitShare,
  cancelSubscription,
  startCheckout,
  openBillingPortal,
} from '@/app/profile/actions';
import { BANDS_CHANGED, type BandOption } from '@/components/band-switcher';
import { subscriptionLabel, type SubscriptionState, type Tone } from '@/lib/subscription';
import { fmtLongDate } from '@/lib/time';
import { ALL_BANDS } from '@/lib/band-view';
import { type BillingPeriod, type PriceTier } from '@/lib/pricing';
import { KIND_LABEL, type BandKind } from '@/lib/plans';
import { brl } from '@/lib/finance';

/** What a new account of each type would cost this person (principal or adesão), for the creation form. */
export type NewAccountQuotes = Record<BandKind, { tier: PriceTier; founder: boolean; monthly: number; annual: number }>;

export type BandMemberView = { userId: string; email: string; label: string; role: 'owner' | 'member'; isSelf: boolean; share: number | null };

/** Owner-only billing data for the subscription card. */
export type BillingView = { monthlyPrice: number; annualPrice: number; tier: PriceTier; founder: boolean; hasStripe: boolean; justPaid: boolean };

type Props = {
  role: 'admin' | 'viewer';
  bandId: string | null;
  bandName: string | null;
  memberships: BandOption[];
  inviteCode: string | null;
  members: BandMemberView[];
  subscription: SubscriptionState | null;
  pricePlan: 'standard' | 'founder' | 'solo';
  kind: BandKind;
  newAccountQuotes: NewAccountQuotes | null;
  billing: BillingView | null;
  founderWhatsappUrl: string | null;
};

const inputCls =
  'bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
const primaryBtn = 'bg-zinc-100 hover:bg-white text-zinc-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors';

const planName = (kind: BandKind, pricePlan: Props['pricePlan'], tier?: PriceTier) =>
  `${KIND_LABEL[kind]}${kind === 'banda' && pricePlan === 'founder' ? ' (Fundador)' : ''}${tier === 'adesao' ? ' · adesão' : ''}`;


const fmtDate = fmtLongDate;

const LABEL_TONE: Record<Tone, string> = {
  neutral: 'text-zinc-300',
  warning: 'text-amber-400',
  danger: 'text-red-400',
};

/** Extra line under the status: when the trial/renewal date falls, or that it never expires (manual free access). */
function subscriptionDateLine(s: Props['subscription']) {
  if (!s) return null;
  if (s.state === 'trial' && s.trialEndsAt) return `Termina em ${fmtDate(s.trialEndsAt)}.`;
  if (s.state === 'active') return s.paidUntil ? `Renova até ${fmtDate(s.paidUntil)}.` : 'Sem data de expiração (acesso liberado manualmente).';
  return null;
}

export function BandSections({ role, bandId, bandName, memberships, inviteCode, members, subscription, pricePlan, kind, newAccountQuotes, billing, founderWhatsappUrl }: Props) {
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [editingInvite, setEditingInvite] = useState(false);
  const [inviteInput, setInviteInput] = useState(inviteCode || '');
  const [newKind, setNewKind] = useState<BandKind>('banda');
  const [newPeriod, setNewPeriod] = useState<BillingPeriod>('monthly');
  const isFreela = kind === 'freela';
  const newQuote = newAccountQuotes?.[newKind];

  const run = async (action: () => Promise<{ error?: string; success?: boolean } | undefined>, okMsg: string) => {
    const res = await action();
    if (res?.error) toast.error(res.error);
    else {
      toast.success(okMsg);
      window.dispatchEvent(new Event(BANDS_CHANGED));
      router.refresh();
    }
    return res;
  };

  const sub = subscriptionLabel(subscription);

  /** Checkout / portal live on stripe.com: ask the server for the URL and leave. */
  const goToStripe = async (action: () => Promise<{ error?: string; url?: string }>) => {
    setPaying(true);
    const res = await action();
    if (res.url) window.location.assign(res.url);
    else {
      toast.error(res.error ?? 'Não foi possível continuar.');
      setPaying(false);
    }
  };

  return (
    <>
      {/* ─── SUAS BANDAS ─── */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm p-6 flex flex-col gap-5">
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-4">
          <Users className="w-5 h-5 text-indigo-400" />
          <h3 className="text-zinc-100 font-bold">Suas contas</h3>
          {memberships.length > 1 && bandId && (
            <button
              type="button"
              onClick={() => run(() => switchBand(ALL_BANDS), 'Mostrando todas as bandas.')}
              className="ml-auto rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              Ver todas
            </button>
          )}
        </div>

        <ul className="flex flex-col gap-2">
          {memberships.map((m) => (
            <li
              key={m.bandId}
              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                m.bandId === bandId ? 'border-zinc-500 bg-zinc-950' : 'border-zinc-800 bg-zinc-950/50'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-100">{m.name}</p>
                <p className="text-xs text-zinc-500">{m.role === 'owner' ? (m.kind === 'freela' ? 'Freela' : 'Dono') : 'Músico'}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {m.bandId === bandId ? (
                  <span className="text-xs font-semibold text-zinc-400">Em uso</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => run(() => switchBand(m.bandId), 'Banda alterada.')}
                    className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                  >
                    Usar
                  </button>
                )}
                <button
                  type="button"
                  title="Sair da banda"
                  onClick={() => {
                    if (confirm(`Sair da banda "${m.name}"?`)) run(() => leaveBand(m.bandId), 'Você saiu da banda.');
                  }}
                  className="p-1.5 text-zinc-500 hover:text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="grid gap-4 sm:grid-cols-2">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const res = await run(() => joinAnotherBand(new FormData(form)), 'Você entrou na banda.');
              if (!res?.error) form.reset();
            }}
            className="flex flex-col gap-2"
          >
            <label className="text-xs font-medium text-zinc-500">Entrar em outra banda com código</label>
            <div className="flex gap-2">
              <input name="inviteCode" required maxLength={12} placeholder="CÓDIGO" className={`${inputCls} w-full min-w-0 uppercase tracking-widest`} />
              <button type="submit" className={primaryBtn}>Entrar</button>
            </div>
          </form>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              fd.set('kind', newKind);
              const res = await createAnotherBand(fd);
              if (res.error) return void toast.error(res.error);
              form.reset();
              window.dispatchEvent(new Event(BANDS_CHANGED));
              // An extra account is paid from the start: straight to the checkout.
              if (res.needsPayment && res.bandId) return goToStripe(() => startCheckout(newPeriod, res.bandId));
              toast.success('Conta criada.');
              router.refresh();
            }}
            className="flex flex-col gap-2"
          >
            <label className="text-xs font-medium text-zinc-500">Criar outra conta</label>
            <div className="flex gap-2 text-xs font-semibold">
              {(['banda', 'freela'] as BandKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setNewKind(k)}
                  className={`rounded-md px-3 py-1.5 ${newKind === k ? 'bg-zinc-100 text-zinc-900' : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
              <select value={newPeriod} onChange={(e) => setNewPeriod(e.target.value as BillingPeriod)} aria-label="Cobrança" className={`${inputCls} ml-auto py-1 text-xs`}>
                <option value="monthly">Mensal</option>
                <option value="annual">Anual</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input name="bandName" required maxLength={60} placeholder={newKind === 'freela' ? 'Nome da conta (ex: Meus freelas)' : 'Nome da banda'} className={`${inputCls} w-full min-w-0`} />
              <button type="submit" disabled={paying} className={`${primaryBtn} disabled:opacity-60`}>Criar</button>
            </div>
            {newQuote && memberships.some((m) => m.role === 'owner') && (
              <p className="text-[11px] leading-snug text-zinc-500">
                {newQuote.tier === 'adesao' ? 'Adesão' : 'Plano'} {KIND_LABEL[newKind]}: <strong className="text-zinc-300">{brl(newPeriod === 'monthly' ? newQuote.monthly : newQuote.annual)}/{newPeriod === 'monthly' ? 'mês' : 'ano'}</strong>, cobrado já na criação (sem teste grátis).
              </p>
            )}
          </form>
        </div>
      </section>

      {/* In "Todas as bandas" there is no single band to manage: point to "Usar" above. */}
      {!bandId && memberships.some((m) => m.role === 'owner') && (
        <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-sm text-zinc-400">
          Você está vendo <strong className="text-zinc-200">todas as bandas</strong>. Para gerenciar uma delas (nome, código de convite, sócios e assinatura), toque em <strong className="text-zinc-200">Usar</strong> na banda acima.
        </p>
      )}

      {/* ─── GESTÃO DA BANDA (DONO) ─── */}
      {role === 'admin' && bandId && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-4">
            <Crown className="w-5 h-5 text-amber-500" />
            <h3 className="text-zinc-100 font-bold">{isFreela ? 'Gestão da conta' : 'Gestão da banda'}</h3>
          </div>

          {sub && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 flex flex-col gap-2">
              <p className="text-xs font-medium text-zinc-500">Plano {planName(kind, pricePlan, billing?.tier)}</p>
              <p className={`text-sm font-semibold ${LABEL_TONE[sub.tone]}`}>{sub.text}</p>
              {subscriptionDateLine(subscription) && <p className="text-xs text-zinc-500">{subscriptionDateLine(subscription)}</p>}
              {billing?.justPaid && <p className="text-xs text-emerald-400">Pagamento recebido! Se o plano ainda não mudou, atualize a página em instantes.</p>}
              {billing && subscription?.state !== 'active' && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {(['monthly', 'annual'] as BillingPeriod[]).map((period) => (
                    <button
                      key={period}
                      type="button"
                      disabled={paying}
                      onClick={() => goToStripe(() => startCheckout(period))}
                      className={`${primaryBtn} flex flex-col items-center gap-0.5 disabled:opacity-60`}
                    >
                      <span>{period === 'monthly' ? `Assinar por ${brl(billing.monthlyPrice)}/mês` : `Assinar por ${brl(billing.annualPrice)}/ano`}</span>
                      <span className="text-[11px] font-medium text-zinc-600">
                        {period === 'annual' ? `cerca de ${brl(billing.annualPrice / 12)}/mês, cobrado de uma vez` : billing.founder ? 'preço de Fundador, para sempre' : billing.tier === 'adesao' ? 'preço de adesão (outra conta sua já paga o plano principal)' : 'cobrança mensal no cartão'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {billing?.hasStripe && (
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => goToStripe(openBillingPortal)}
                  className="mt-1 self-start text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-60"
                >
                  Gerenciar assinatura (cartão, faturas, cancelamento)
                </button>
              )}
              {!billing?.hasStripe && (subscription?.state === 'trial' || subscription?.state === 'active') && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        'Cancelar a assinatura bloqueia a edição imediatamente (os dados continuam salvos). Pra voltar a usar depois, é só assinar de novo. Continuar?'
                      )
                    ) {
                      run(() => cancelSubscription(), 'Assinatura cancelada.');
                    }
                  }}
                  className="mt-1 self-start text-xs font-semibold text-red-400 hover:text-red-300"
                >
                  Cancelar assinatura
                </button>
              )}
            </div>
          )}

          {founderWhatsappUrl && (
            <a
              href={founderWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-3 text-sm font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/20"
            >
              <MessageCircle className="h-5 w-5 shrink-0" />
              Você é Fundador! Entre no grupo exclusivo do WhatsApp
            </a>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await run(() => renameBand(new FormData(e.currentTarget)), 'Nome atualizado.');
            }}
            className="flex flex-col gap-2"
          >
            <label className="text-xs font-medium text-zinc-500">{isFreela ? 'Nome da conta' : 'Nome da banda'}</label>
            <div className="flex gap-2">
              <input key={bandId} name="bandName" defaultValue={bandName ?? ''} required maxLength={60} className={`${inputCls} w-full min-w-0`} />
              <button type="submit" className={primaryBtn}>Salvar</button>
            </div>
          </form>

          {!isFreela && (
            <>
          <div>
            <label className="text-xs font-medium text-zinc-500 block mb-1">Código de convite da banda</label>
            {editingInvite ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData();
                  fd.set('inviteCode', inviteInput);
                  const res = await run(() => saveInviteCode(fd), 'Código de convite salvo.');
                  if (!res?.error) setEditingInvite(false);
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value.toUpperCase().slice(0, 5))}
                  maxLength={5}
                  autoFocus
                  className={`${inputCls} w-28 font-mono text-lg font-bold tracking-widest uppercase`}
                />
                <button type="submit" className={primaryBtn}>Salvar</button>
                <button
                  type="button"
                  onClick={() => {
                    setInviteInput(inviteCode || '');
                    setEditingInvite(false);
                  }}
                  className="p-2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <code className="bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono text-lg px-4 py-2 rounded-lg font-bold tracking-widest">
                  {inviteCode || 'N/A'}
                </code>
                <button
                  type="button"
                  onClick={() => setEditingInvite(true)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded-md"
                  title="Editar código de convite"
                >
                  <PenLine className="w-4 h-4" />
                </button>
                <p className="text-xs text-zinc-500 max-w-[220px]">Envie este código aos músicos para que entrem na banda.</p>
              </div>
            )}
          </div>

          {/* Indicação: o crédito de 30 dias existe no servidor (grantReferralCredit), mas ainda não
              há onde digitar o código de quem indicou — volta quando a tela de Indicações existir. */}
          <p className="text-xs text-zinc-500">
            Em breve: indique outra banda com o código <strong className="text-zinc-300">{inviteCode || 'N/A'}</strong> e ganhe 30 dias grátis.
          </p>

          <div className="border-t border-zinc-800/80 pt-6">
            <h4 className="text-sm font-bold text-zinc-300 mb-1">Quem participa da banda</h4>
            <p className="text-xs text-zinc-500 mb-4">Donos têm os mesmos direitos: financeiro, membros, convites e assinatura.</p>
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-zinc-200">{m.label}{m.isSelf ? ' (você)' : ''}</p>
                    <p className={`text-xs font-medium ${m.role === 'owner' ? 'text-amber-500' : 'text-zinc-500'}`}>
                      {m.role === 'owner' ? 'Dono' : 'Músico'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {m.role === 'owner' && (
                      <label className="mr-1 flex items-center gap-1 text-xs text-zinc-500" title="Percentual do lucro no relatório. Vazio = divisão igual.">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          defaultValue={m.share ?? ''}
                          placeholder="igual"
                          aria-label={`Percentual do lucro de ${m.label}`}
                          onBlur={async (e) => {
                            const raw = e.currentTarget.value.trim();
                            const value = raw === '' ? null : Number(raw);
                            if (value === m.share) return;
                            const res = await setProfitShare(m.userId, value);
                            if (res?.error) toast.error(res.error);
                            else {
                              toast.success('Percentual salvo.');
                              router.refresh();
                            }
                          }}
                          className="w-16 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-right text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
                        />
                        %
                      </label>
                    )}
                    {m.role === 'member' ? (
                      <button
                        type="button"
                        title="Tornar dono"
                        onClick={() => {
                          if (confirm(`Tornar ${m.label} dono da banda? Ele terá os mesmos direitos que você, inclusive o financeiro.`)) {
                            run(() => setMemberRole(m.userId, 'owner'), 'Agora é dono da banda.');
                          }
                        }}
                        className="p-2 rounded-md text-amber-500 hover:bg-amber-500/10"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        title="Tornar músico"
                        onClick={() => run(() => setMemberRole(m.userId, 'member'), 'Agora é músico da banda.')}
                        className="p-2 rounded-md text-zinc-400 hover:bg-zinc-800"
                      >
                        <ShieldOff className="w-4 h-4" />
                      </button>
                    )}
                    {!m.isSelf && m.role === 'member' && (
                      <button
                        type="button"
                        title="Remover da banda"
                        onClick={() => {
                          if (confirm(`Remover ${m.label} da banda?`)) run(() => removeMember(m.userId), 'Removido da banda.');
                        }}
                        className="p-2 rounded-md text-red-500 hover:bg-red-500/10"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {members.length === 0 && <span className="text-xs text-zinc-500 font-medium">Nenhum membro encontrado.</span>}
            </div>
          </div>
            </>
          )}
        </section>
      )}

      {/* ─── MÚSICO: CÓDIGO DA BANDA ─── */}
      {role !== 'admin' && bandId && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-2">
          <p className="text-xs font-medium text-zinc-500">Código de convite desta banda</p>
          <code className="w-fit bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono text-lg px-4 py-2 rounded-lg font-bold tracking-widest">
            {inviteCode || 'N/A'}
          </code>
        </section>
      )}
    </>
  );
}

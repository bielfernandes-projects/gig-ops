'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Crown, Users, UserMinus, PenLine, X, ShieldCheck, ShieldOff, LogOut } from 'lucide-react';
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
} from '@/app/profile/actions';
import type { BandOption } from '@/components/band-switcher';

export type BandMemberView = { userId: string; email: string; role: 'owner' | 'member'; isSelf: boolean; share: number | null };

type Props = {
  role: 'admin' | 'viewer';
  bandId: string | null;
  bandName: string | null;
  memberships: BandOption[];
  inviteCode: string | null;
  members: BandMemberView[];
  subscription: { state: 'trial' | 'active' | 'expired'; daysLeft: number | null } | null;
};

const inputCls =
  'bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
const primaryBtn = 'bg-zinc-100 hover:bg-white text-zinc-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors';

function subscriptionLabel(s: Props['subscription']) {
  if (!s) return null;
  if (s.state === 'active') return { text: 'Assinatura ativa', tone: 'text-zinc-300' };
  if (s.state === 'trial') {
    return { text: s.daysLeft ? `Teste grátis: ${s.daysLeft} ${s.daysLeft === 1 ? 'dia restante' : 'dias restantes'}` : 'Teste grátis', tone: 'text-amber-400' };
  }
  return { text: 'Assinatura expirada: dados preservados, edição bloqueada', tone: 'text-red-400' };
}

export function BandSections({ role, bandId, bandName, memberships, inviteCode, members, subscription }: Props) {
  const router = useRouter();
  const [editingInvite, setEditingInvite] = useState(false);
  const [inviteInput, setInviteInput] = useState(inviteCode || '');

  const run = async (action: () => Promise<{ error?: string; success?: boolean } | undefined>, okMsg: string) => {
    const res = await action();
    if (res?.error) toast.error(res.error);
    else {
      toast.success(okMsg);
      router.refresh();
    }
    return res;
  };

  const sub = subscriptionLabel(subscription);

  return (
    <>
      {/* ─── SUAS BANDAS ─── */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm p-6 flex flex-col gap-5">
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-4">
          <Users className="w-5 h-5 text-indigo-400" />
          <h3 className="text-zinc-100 font-bold">Suas bandas</h3>
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
                <p className="text-xs text-zinc-500">{m.role === 'owner' ? 'Dono' : 'Músico'}</p>
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
              <input name="inviteCode" required maxLength={5} placeholder="CÓDIGO" className={`${inputCls} w-full min-w-0 uppercase tracking-widest`} />
              <button type="submit" className={primaryBtn}>Entrar</button>
            </div>
          </form>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const res = await run(() => createAnotherBand(new FormData(form)), 'Banda criada.');
              if (!res?.error) form.reset();
            }}
            className="flex flex-col gap-2"
          >
            <label className="text-xs font-medium text-zinc-500">Criar uma nova banda</label>
            <div className="flex gap-2">
              <input name="bandName" required maxLength={60} placeholder="Nome da banda" className={`${inputCls} w-full min-w-0`} />
              <button type="submit" className={primaryBtn}>Criar</button>
            </div>
          </form>
        </div>
      </section>

      {/* ─── GESTÃO DA BANDA (DONO) ─── */}
      {role === 'admin' && bandId && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-4">
            <Crown className="w-5 h-5 text-amber-500" />
            <h3 className="text-zinc-100 font-bold">Gestão da banda</h3>
          </div>

          {sub && <p className={`text-sm font-semibold ${sub.tone}`}>{sub.text}</p>}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await run(() => renameBand(new FormData(e.currentTarget)), 'Nome atualizado.');
            }}
            className="flex flex-col gap-2"
          >
            <label className="text-xs font-medium text-zinc-500">Nome da banda</label>
            <div className="flex gap-2">
              <input key={bandId} name="bandName" defaultValue={bandName ?? ''} required maxLength={60} className={`${inputCls} w-full min-w-0`} />
              <button type="submit" className={primaryBtn}>Salvar</button>
            </div>
          </form>

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

          <div className="border-t border-zinc-800/80 pt-6">
            <h4 className="text-sm font-bold text-zinc-300 mb-1">Quem participa da banda</h4>
            <p className="text-xs text-zinc-500 mb-4">Donos têm os mesmos direitos: financeiro, membros, convites e assinatura.</p>
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-zinc-200">{m.email}{m.isSelf ? ' (você)' : ''}</p>
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
                          aria-label={`Percentual do lucro de ${m.email}`}
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
                          if (confirm(`Tornar ${m.email} dono da banda? Ele terá os mesmos direitos que você, inclusive o financeiro.`)) {
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
                          if (confirm(`Remover ${m.email} da banda?`)) run(() => removeMember(m.userId), 'Removido da banda.');
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

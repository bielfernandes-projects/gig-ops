'use client';

import { EditableLine } from '@/components/editable-line';
import { ThemeToggle } from '@/components/theme-toggle';
import { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, LogOut, KeyRound, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { updatePassword, setDisplayName, renameBand } from '@/app/profile/actions';
import { savePushSubscription, removePushSubscription } from '@/app/actions/push-actions';
import { signout } from '@/app/login/actions';
import { BandSections, type BandMemberView } from '@/components/band-sections';
import type { BandOption } from '@/components/band-switcher';

type Props = {
  role: 'admin' | 'viewer';
  email: string | null | undefined;
  displayName: string | null;
  bandId: string | null;
  bandName: string | null;
  memberships: BandOption[];
  inviteCode: string | null;
  members: BandMemberView[];
  subscription: { state: 'trial' | 'active' | 'expired'; daysLeft: number | null } | null;
};

export default function ProfileClient({ role, email, displayName, bandId, bandName, memberships, inviteCode, members, subscription }: Props) {
  const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'active' | 'denied'>('idle');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') setPushStatus('active');
      else if (Notification.permission === 'denied') setPushStatus('denied');
    }
  }, []);

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 md:p-10 pb-32 flex flex-col gap-8">
      
      {/* ─── HEADER ─── */}
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50 mb-2">Perfil</h1>
        <p className="text-zinc-400 text-sm">Gerencie sua conta e visualize suas métricas.</p>
      </header>

      {/* ─── SECTION A: MEU PERFIL ─── */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-6 flex flex-col items-center border-b border-zinc-800/80">
          <div className="flex w-full max-w-sm flex-col">
            <EditableLine
              label="Nome"
              value={displayName}
              placeholder="Como você quer ser chamado"
              maxLength={40}
              onSave={async (v) => {
                const res = await setDisplayName(v);
                if (res?.error) return res.error;
                toast.success(v.trim() ? 'Nome salvo.' : 'Nome removido.');
              }}
            />
            <EditableLine label="E-mail" value={email ?? null} placeholder="" maxLength={0} editable={false} onSave={async () => {}} />
            {bandName && (
              <EditableLine
                label="Banda"
                value={bandName}
                placeholder="Nome da banda"
                maxLength={60}
                editable={role === 'admin'}
                onSave={async (v) => {
                  const fd = new FormData();
                  fd.set('bandName', v);
                  const res = await renameBand(fd);
                  if (res?.error) return res.error;
                  toast.success('Nome da banda salvo.');
                }}
              />
            )}
          </div>

          <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            role === 'admin' 
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
          }`}>
            {role === 'admin' ? (
              <><ShieldCheck className="w-3.5 h-3.5" /> Dono da banda</>
            ) : (
              <><ShieldAlert className="w-3.5 h-3.5" /> Músico da banda</>
            )}
          </div>
        </div>
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-zinc-100 text-sm font-semibold">Aparência</p>
            <p className="text-zinc-500 text-xs">Alternar entre tema claro e escuro.</p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      {/* ─── SECTION: AGENDA E NOTIFICAÇÕES ─── */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-4">
          <Bell className="w-5 h-5 text-emerald-400" />
          <h3 className="text-zinc-100 font-bold">Notificações Push</h3>
        </div>

        <div>
          <p className="text-xs text-zinc-400 mb-4">
            {pushStatus === 'active'
              ? 'Você está inscrito. Receberá alertas quando for escalado para um show.'
              : pushStatus === 'denied'
              ? 'Permissão bloqueada pelo dispositivo. Ative nas configurações do navegador.'
              : 'Ative para receber alertas automáticos quando o admin te escalar para um novo show.'}
          </p>

          {pushStatus === 'active' ? (
            <button
              onClick={async () => {
                if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
                  toast.error('Este navegador não suporta Push Notifications.');
                  return;
                }
                setPushStatus('loading');
                try {
                  const reg = await navigator.serviceWorker.ready;
                  const sub = await reg.pushManager.getSubscription();
                  if (sub) {
                    const endpoint = sub.endpoint;
                    const userId = (await (await fetch('/api/me')).json())?.id;
                    // 1) Unsubscribe the browser-side subscription
                    await sub.unsubscribe();
                    // 2) Remove from DB
                    if (userId && endpoint) {
                      const res = await removePushSubscription(userId, endpoint);
                      if (res?.error) console.warn('removePushSubscription error:', res.error);
                    }
                  }
                  setPushStatus('idle');
                  toast.success('Notificações desativadas.');
                } catch (err) {
                  console.error(err);
                  toast.error('Falha ao desativar notificações.');
                  setPushStatus('active');
                }
              }}
              className="flex items-center justify-center gap-2 font-bold px-4 py-2.5 rounded-lg text-sm transition-colors w-full md:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
            >
              <BellOff className="w-4 h-4" />
              Desativar Notificações
            </button>
          ) : (
            <button
              disabled={pushStatus === 'denied' || pushStatus === 'loading'}
              onClick={async () => {
                if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
                  toast.error('Este navegador não suporta Push Notifications.');
                  return;
                }
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
                if (isIOS && !isStandalone) {
                  toast.error('No iOS, as notificações Push só funcionam pelo App adicionado à Tela de Início. Use o Safari, toque em Compartilhar > Adicionar à Tela de Início.');
                  return;
                }
                setPushStatus('loading');
                try {
                  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
                    toast.error('Erro de configuração: Chave VAPID não encontrada.');
                    setPushStatus('idle');
                    return;
                  }
                  await navigator.serviceWorker.register('/sw.js');
                  const permission = await Notification.requestPermission();
                  if (permission !== 'granted') {
                    setPushStatus('denied');
                    toast.error('Permissão negada pelo dispositivo. Verifique as configurações de notificação nas Ajustes do iOS.');
                    return;
                  }
                  const reg = await navigator.serviceWorker.ready;
                  const existing = await reg.pushManager.getSubscription();
                  const sub = existing ?? await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
                  });
                  const subJson = sub.toJSON();
                  const userId = (await (await fetch('/api/me')).json())?.id;
                  const res = await savePushSubscription(userId || '', subJson);
                  if (res?.error) {
                    toast.error('Erro ao salvar assinatura: ' + res.error);
                    setPushStatus('idle');
                  } else {
                    setPushStatus('active');
                    toast.success('Notificações ativadas com sucesso!');
                  }
                } catch (err) {
                  console.error(err);
                  toast.error('Falha ao ativar notificações.');
                  setPushStatus('idle');
                }
              }}
              className={`flex items-center justify-center gap-2 font-bold px-4 py-2.5 rounded-lg text-sm transition-colors w-full md:w-auto ${
                pushStatus === 'denied'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20 cursor-not-allowed'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
              }`}
            >
              <Bell className="w-4 h-4" />
              {pushStatus === 'loading' ? 'Ativando...' : pushStatus === 'denied' ? 'Permissão Bloqueada' : 'Ativar Notificações no Celular'}
            </button>
          )}
        </div>
      </section>

      <BandSections
        role={role}
        bandId={bandId}
        bandName={bandName}
        memberships={memberships}
        inviteCode={inviteCode}
        members={members}
        subscription={subscription}
      />

      {/* ─── SECTION: SEGURANÇA E ACESSO ─── */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        {/* Update Password Form */}
        <form 
          action={async (formData) => {
            const res = await updatePassword(formData);
            if (res.error) toast.error(res.error);
            else {
              toast.success('Senha atualizada com sucesso!');
              (document.getElementById('pwd-form') as HTMLFormElement).reset();
            }
          }}
          id="pwd-form"
          className="p-6 flex flex-col gap-4 border-b border-zinc-800/80"
        >
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-bold text-zinc-300">Alterar Senha</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="password" name="password" required placeholder="Nova senha" minLength={8} className="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors" />
            <input type="password" name="confirmPassword" required placeholder="Confirmar nova senha" minLength={8} className="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors" />
            <button type="submit" className="bg-zinc-100 hover:bg-white text-zinc-900 font-bold px-6 py-2.5 rounded-lg text-sm transition-transform active:scale-95 shrink-0">Atualizar</button>
          </div>
        </form>

        {/* Logout */}
        <div className="p-4">
          <form action={signout}>
            <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-colors">
              <LogOut className="w-4 h-4" /> Sair da Conta
            </button>
          </form>
        </div>
      </section>

    </div>
  );
}

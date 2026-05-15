'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, LogOut, KeyRound, UserMinus, Crown, Calendar, Bell, Copy, Check, Clipboard, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { updatePassword, removeProfile } from '@/app/profile/actions';
import { savePushSubscription } from '@/app/actions/push-actions';
import { GigWithProject, GoLineup, GoProfile } from '@/lib/types';
import { signout } from '@/app/login/actions';

type Props = {
  role: string | null;
  email: string | null | undefined;
  inviteCode: string | null;
  profiles: GoProfile[];
  gigs: GigWithProject[];
  lineups: GoLineup[];
  userMemberId: string | null;
  calendarToken: string | null;
};

// Sub-component: isolated copy state per user row
function ProfileEmailRow({ profile, onRemove }: { profile: GoProfile; onRemove: () => void }) {
  const [emailCopied, setEmailCopied] = useState(false);

  const handleCopyEmail = async () => {
    if (!profile.email) return;
    await navigator.clipboard.writeText(profile.email);
    setEmailCopied(true);
    toast.success('E-mail copiado!');
    setTimeout(() => setEmailCopied(false), 2500);
  };

  return (
    <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-zinc-200 truncate max-w-[180px]">{profile.email}</span>
          <button
            onClick={handleCopyEmail}
            title="Copiar e-mail"
            className="p-1 rounded text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors shrink-0"
          >
            {emailCopied
              ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
              : <Clipboard className="w-3.5 h-3.5" />
            }
          </button>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
          profile.role === 'admin' ? 'text-amber-500' : 'text-zinc-500'
        }`}>
          {profile.role}
        </span>
      </div>
      {profile.role !== 'admin' && (
        <button
          onClick={onRemove}
          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md transition-colors shrink-0 ml-2"
          title="Remover usuário"
        >
          <UserMinus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function ProfileClient({ role, email, inviteCode, profiles, gigs, lineups, userMemberId, calendarToken }: Props) {
  const [originUrl, setOriginUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'active' | 'denied'>('idle');

  useEffect(() => {
    // Check initial notification permission status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') setPushStatus('active');
      else if (Notification.permission === 'denied') setPushStatus('denied');
    }
  }, []);

  useEffect(() => {
    setOriginUrl(window.location.origin);
  }, []);

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 md:p-10 pb-32 flex flex-col gap-8">
      
      {/* ─── HEADER ─── */}
      <header>
        <h1 className="text-3xl font-black tracking-tight text-zinc-50 mb-2">Perfil</h1>
        <p className="text-zinc-400 text-sm">Gerencie sua conta e visualize suas métricas.</p>
      </header>

      {/* ─── SECTION A: MEU PERFIL ─── */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-6 flex flex-col items-center text-center border-b border-zinc-800/80">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 border border-zinc-700">
            <span className="text-xl font-bold uppercase text-zinc-300">
              {email ? email.substring(0, 2) : '??'}
            </span>
          </div>
          
          <h2 className="text-zinc-100 font-bold text-lg mb-1">{email}</h2>
          
          <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
            role === 'admin' 
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
          }`}>
            {role === 'admin' ? (
              <><ShieldCheck className="w-3.5 h-3.5" /> Admin Minha Banda</>
            ) : (
              <><ShieldAlert className="w-3.5 h-3.5" /> Músico / Visualizador</>
            )}
          </div>
        </div>
        
      </section>

      {/* ─── SECTION: AGENDA E NOTIFICAÇÕES ─── */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-4">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <h3 className="text-zinc-100 font-bold">Agenda & Notificações</h3>
        </div>

        <div>
          <h4 className="text-sm font-bold text-zinc-300 mb-2">
            {role === 'admin' ? 'Agenda Global (iCal)' : 'Minha Agenda (iCal)'}
          </h4>
          {calendarToken ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-zinc-400">
                Copie o link abaixo e adicione-o no seu Google Agenda (<strong>Configurações &gt; Adicionar agenda &gt; Do URL</strong>). Este processo deve ser feito pelo computador (Desktop) e não pelo aplicativo. Basta fazer uma vez e seus novos shows e mudanças de horário serão atualizados automaticamente.
              </p>
              
              <div className="flex flex-col md:flex-row gap-2 mt-1">
                <input 
                  type="text" 
                  readOnly 
                  value={originUrl ? `${originUrl}/api/calendar/${calendarToken}` : ''}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-zinc-400 font-mono focus:outline-none placeholder-zinc-800"
                  placeholder="Carregando link..."
                />
                <button 
                  onClick={() => {
                    if (originUrl) {
                      navigator.clipboard.writeText(`${originUrl}/api/calendar/${calendarToken}`);
                      setIsCopied(true);
                      toast.success('Link copiado!');
                      setTimeout(() => setIsCopied(false), 3000);
                    }
                  }}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap shadow-md"
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {isCopied ? 'Copiado!' : 'Copiar Link'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-red-500 font-medium bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              {role === 'admin' 
                ? 'Nenhum token gerado para a banda. Solicite a migração de banco.' 
                : 'Não localizamos seu token na tabela de músicos. Peça ao administrador.'}
            </p>
          )}
        </div>

        <div className="border-t border-zinc-800/80 pt-6">
          <h4 className="text-sm font-bold text-zinc-300 mb-2 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            Notificações Push
          </h4>
          <p className="text-xs text-zinc-400 mb-4">
            {pushStatus === 'active'
              ? 'Você já está inscrito. Receberá alertas quando for escalado para um show!'
              : pushStatus === 'denied'
              ? 'Permissão bloqueada pelo dispositivo. Ative nas configurações do navegador.'
              : 'Ative para receber alertas automáticos quando o admin te escalar para um novo show.'}
          </p>
          
          <button 
            disabled={pushStatus === 'active' || pushStatus === 'denied' || pushStatus === 'loading'}
            onClick={async () => {
              if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
                toast.error('Este navegador não suporta Push Notifications.');
                return;
              }
              setPushStatus('loading');
              try {
                if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
                  toast.error('Erro de configuração: Chave VAPID não encontrada.');
                  setPushStatus('idle');
                  return;
                }
                // Register service worker if not already registered
                await navigator.serviceWorker.register('/sw.js');
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                  setPushStatus('denied');
                  toast.error('Permissão negada pelo dispositivo.');
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
                // Fallback: try getting from profile card email (server-side we resolve this client-side)
                const res = await savePushSubscription(userId || '', subJson);
                if (res?.error) {
                  toast.error('Erro ao salvar assinatura: ' + res.error);
                  setPushStatus('idle');
                } else {
                  setPushStatus('active');
                  toast.success('Notificações ativadas com sucesso! 🔔');
                }
              } catch (err) {
                console.error(err);
                toast.error('Falha ao ativar notificações.');
                setPushStatus('idle');
              }
            }}
            className={`flex items-center justify-center gap-2 font-bold px-4 py-2.5 rounded-lg text-sm transition-colors w-full md:w-auto ${
              pushStatus === 'active'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                : pushStatus === 'denied'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 cursor-not-allowed'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
            }`}
          >
            <Bell className="w-4 h-4" />
            {pushStatus === 'loading' ? 'Ativando...' : pushStatus === 'active' ? 'Notificações Ativas ✓' : pushStatus === 'denied' ? 'Permissão Bloqueada' : 'Ativar Notificações no Celular'}
          </button>
        </div>
      </section>

      {/* ─── SECTION: GESTÃO DA BANDA (ADMIN) ─── */}
      {role === 'admin' && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-4">
            <Crown className="w-5 h-5 text-amber-500" />
            <h3 className="text-zinc-100 font-bold">Gestão da Banda</h3>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block mb-1">
              Código de Convite
            </label>
            <div className="flex items-center gap-3">
              <code className="bg-zinc-950 border border-zinc-800 text-emerald-400 font-mono text-lg px-4 py-2 rounded-lg font-bold tracking-widest">
                {inviteCode || 'N/A'}
              </code>
              <p className="text-xs text-zinc-500 max-w-[200px]">
                Envie este código aos seus músicos para que eles possam criar conta no Minha Banda.
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-800/80 pt-6">
            <h4 className="text-sm font-bold text-zinc-300 mb-4">Usuários do App</h4>
            <p className="text-xs text-zinc-500 mb-3">Clique no ícone de cópia para copiar o e-mail do músico e adicioná-lo ao seu perfil.</p>
            <div className="flex flex-col gap-3">
              {profiles.map(p => (
                <ProfileEmailRow
                  key={p.id}
                  profile={p}
                  onRemove={async () => {
                    if (confirm('Tem certeza que deseja remover este usuário (apenas do perfil público)?')) {
                      const res = await removeProfile(p.id);
                      if (res.error) toast.error(res.error);
                      else toast.success('Usuário removido da banda.');
                    }
                  }}
                />
              ))}
              {profiles.length === 0 && <span className="text-xs text-zinc-500 font-medium">Nenhum perfil encontrado.</span>}
            </div>
          </div>


        </section>
      )}

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
          
          <div className="flex flex-col gap-3 md:flex-row">
            <input type="password" name="password" required placeholder="Nova senha" minLength={6} className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors" />
            <input type="password" name="confirmPassword" required placeholder="Confirmar nova senha" minLength={6} className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors" />
            <button type="submit" className="bg-zinc-100 hover:bg-white text-zinc-900 font-bold px-6 py-2.5 rounded-lg text-sm transition-transform active:scale-95 whitespace-nowrap">Atualizar</button>
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

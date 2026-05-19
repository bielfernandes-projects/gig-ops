'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { PasswordStrengthIndicator, isPasswordValid } from '@/components/password-strength-indicator';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const supabase = createClient();

    const handleSession = async () => {
      const { data: existingSession } = await supabase.auth.getSession();

      if (existingSession?.session) {
        setIsLoadingSession(false);
        return;
      }

      const params = new URLSearchParams(window.location.hash.replace('#', '?'));
      const code = params.get('code') || new URL(window.location.href).searchParams.get('code');

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.session) {
          setSessionError('Não foi possível iniciar o fluxo de recuperação. Verifique o link e tente novamente.');
        }
      } else {
        setSessionError('Sessão de recuperação não encontrada. Abra o link do e-mail novamente.');
      }

      setIsLoadingSession(false);
    };

    handleSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password || !confirmPassword) {
      setErrorMsg('Preencha os dois campos de senha.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    const supabase = createClient();
    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error.message || 'Não foi possível atualizar a senha. Tente novamente.');
      return;
    }

    toast.success('Senha atualizada com sucesso! Faça login novamente.');
    router.push('/login');
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-950 z-[999] px-4 overflow-hidden pt-safe pb-safe">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 flex flex-col items-center max-h-[98%] overflow-y-auto no-scrollbar">
        <div className="mb-4 relative w-28 h-28 shrink-0">
          <Image 
            src="/logo.svg" 
            alt="Minha Banda Logo" 
            fill
            className="invert brightness-200 object-contain"
            priority
          />
        </div>

        <h1 className="text-xl md:text-2xl font-black text-zinc-50 mb-1 tracking-tight text-center">Redefinir senha</h1>
        <p className="text-xs md:text-sm text-zinc-400 mb-6 font-medium text-center">
          Informe uma nova senha para seguir ao login.
        </p>

        {isLoadingSession ? (
          <div className="w-full bg-zinc-950/80 border border-zinc-800 text-zinc-300 text-[11px] p-3 rounded-lg text-center mb-4 font-semibold">
            Verificando o link de recuperação...
          </div>
        ) : sessionError ? (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] p-3 rounded-lg text-center mb-4 font-semibold">
            {sessionError}
          </div>
        ) : null}

        {errorMsg && (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] p-3 rounded-lg text-center mb-4 font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <fieldset disabled={isSubmitting || isLoadingSession || Boolean(sessionError)} className="space-y-0">
          <div className="flex flex-col gap-1 relative">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
              Nova senha
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700 pr-10"
              placeholder="••••••••"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-9 text-zinc-400 hover:text-zinc-100"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PasswordStrengthIndicator password={password} />

          <div className="flex flex-col gap-1 relative">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
              Confirme a nova senha
            </label>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700 pr-10"
              placeholder="••••••••"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="absolute right-3 top-9 text-zinc-400 hover:text-zinc-100"
              aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoadingSession || Boolean(sessionError) || !isPasswordValid(password)}
            className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-bold py-2.5 rounded-lg text-sm transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Nova Senha'}
          </button>
        </fieldset>
        </form>

        <button
          type="button"
          onClick={() => router.push('/login')}
          className="mt-4 text-xs text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
        >
          Voltar ao login
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Logo } from '@/components/logo';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { login, signup, forgotPassword, adminSignup } from './actions';
import { createClient } from '@/lib/supabase/client';
import { PasswordStrengthIndicator, isPasswordValid } from '@/components/password-strength-indicator';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminSignup, setIsAdminSignup] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (successMsg) {
      timer = setTimeout(() => {
        setSuccessMsg(false);
        setIsLogin(true);
      }, 10000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [successMsg]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg(false);

    const formData = new FormData(e.currentTarget);
    formData.append('origin', window.location.origin);

    const res = isLogin ? await login(formData) : isAdminSignup ? await adminSignup(formData) : await signup(formData);

    if (res?.error) {
      setErrorMsg(res.error);
      setIsLoading(false);
    } else if (!isLogin && res && 'success' in res && res.success) {
      setSuccessMsg(true);
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg('');
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) setErrorMsg('Não foi possível iniciar o login com Google.');
  };

  const handleForgotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsForgotLoading(true);
    setForgotMessage('');

    const formData = new FormData(e.currentTarget);
    formData.append('origin', window.location.origin);

    const res = await forgotPassword(formData);

    if (res?.error) {
      setForgotMessage(res.error);
      setIsForgotLoading(false);
      return;
    }

    setForgotMessage('Link de recuperação enviado! Verifique seu e-mail para continuar.');
    setIsForgotLoading(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-950 z-[999] px-4 overflow-hidden pt-safe pb-safe">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 flex flex-col items-center max-h-[98%] overflow-y-auto no-scrollbar">
        <Logo className="mb-4 h-auto w-48 shrink-0 md:w-56" priority />

        {!successMsg && (
          <>
            <h1 className="sr-only">Gigueiros</h1>
            <p className="text-xs md:text-sm text-zinc-400 mb-6 font-medium text-center">
              {isLogin
                ? 'Bem-vindo ao Gigueiros. Faça login para gerenciar sua agenda.'
                : isAdminSignup
                  ? 'Crie sua própria banda e gerencie seus shows, músicos e projetos.'
                  : 'Cadastre-se na banda da qual foi convidado.'}
            </p>
          </>
        )}

        {successMsg ? (
          <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6 text-center w-full">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
            <h2 className="text-lg font-bold text-emerald-400 mb-2">Quase lá!</h2>
            <p className="text-sm text-zinc-300">
              Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar sua conta e acessar a banda.
            </p>
          </div>
        ) : (
          <>
            {(errorMsg || forgotMessage) && (
              <div
                className={`w-full ${errorMsg ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'} border rounded-lg text-[11px] p-2 mb-3 font-semibold text-center`}
              >
                {errorMsg || forgotMessage}
              </div>
            )}

            {isForgotPassword ? (
              <form onSubmit={handleForgotSubmit} className="w-full flex flex-col gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-400">
                    E-mail para recuperação
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
                    placeholder="seu@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-bold py-2.5 rounded-lg text-sm transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isForgotLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setForgotMessage('');
                    setErrorMsg('');
                  }}
                  className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
                >
                  Voltar para o login
                </button>
              </form>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-400">
                      E-mail
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-400">
                      Senha
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700 pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-zinc-100"
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {!isLogin && <PasswordStrengthIndicator password={password} />}
                  </div>

                  {!isLogin && isAdminSignup && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-zinc-400">Nome da banda</label>
                      <input
                        type="text"
                        name="bandName"
                        required
                        maxLength={60}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
                        placeholder="Ex: Banda Horizonte"
                      />
                    </div>
                  )}

                  {!isLogin && !isAdminSignup && (
                    <div className="flex flex-col gap-1 mt-1 p-2.5 bg-zinc-950/50 border border-zinc-800/80 rounded-lg">
                      <label className="text-xs font-medium text-zinc-400 flex justify-between">
                        Código de Convite da Banda
                      </label>
                      <input
                        type="text"
                        name="inviteCode"
                        className="w-full bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-2 mt-1 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
                        placeholder="Ex: BANDA2026"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || (!isLogin && !isPasswordValid(password))}
                    className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-bold py-2.5 mt-2 rounded-lg text-sm transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Autenticando...' : isLogin ? 'Entrar' : isAdminSignup ? 'Criar minha banda' : 'Registrar'}
                  </button>

                  {isAdminSignup && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminSignup(false);
                        setErrorMsg('');
                      }}
                      className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
                    >
                      Voltar para cadastro com convite
                    </button>
                  )}
                </form>

                <div className="w-full flex items-center gap-3 my-4">
                  <span className="h-px flex-1 bg-zinc-800" />
                  <span className="text-xs text-zinc-500 font-medium">ou</span>
                  <span className="h-px flex-1 bg-zinc-800" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogle}
                  className="w-full py-2.5 px-3 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 font-semibold rounded-lg flex items-center justify-center gap-2.5 text-sm transition-transform active:scale-[0.98]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/>
                    <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/>
                    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
                  </svg>
                  Continuar com Google
                </button>

                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMsg('');
                      setForgotMessage('');
                    }}
                    className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
                  >
                    Esqueci a senha
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (isAdminSignup) {
                      setIsAdminSignup(false);
                      setIsLogin(true);
                    } else {
                      setIsLogin(!isLogin);
                    }
                    setErrorMsg('');
                    setForgotMessage('');
                  }}
                  className="mt-4 text-xs text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
                >
                  {isAdminSignup ? 'Já tem conta? Faça login.' : isLogin ? 'Não tem conta? Crie uma aqui.' : 'Já tem conta? Faça login.'}
                </button>

                {!isLogin && !isAdminSignup && (
                  <div className="w-full flex flex-col items-center mt-4 pt-4 border-t border-zinc-800/80">
                    <span className="text-xs text-zinc-500 mb-3 font-medium">ou</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminSignup(true);
                        setErrorMsg('');
                        setForgotMessage('');
                      }}
                      className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-md text-sm transition-all active:scale-[0.98]"
                    >
                      Criar minha banda
                    </button>
                    <p className="text-[11px] text-zinc-500 font-medium text-center mt-1.5 max-w-[220px] leading-tight">
                      Seja o administrador da sua própria agenda.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

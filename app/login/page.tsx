'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import { login, signup } from './actions';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    
    const res = isLogin 
      ? await login(formData)
      : await signup(formData);
      
    if (res?.error) {
      setErrorMsg(res.error);
      setIsLoading(false);
    } else if (!isLogin && res && 'success' in res && res.success) {
      setSuccessMsg(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center overflow-hidden bg-zinc-950 px-4 relative max-w-md mx-auto w-full">
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 flex flex-col items-center">
        
        <div className="mb-4 relative w-40 h-40 shrink-0">
          <Image 
            src="/logo.svg" 
            alt="Minha Banda Logo" 
            fill
            className="invert brightness-200 object-contain"
            priority
          />
        </div>
        
        {!successMsg && (
          <>
            <h1 className="text-xl md:text-2xl font-black text-zinc-50 mb-1 tracking-tight text-center">Minha Banda App</h1>
            <p className="text-xs md:text-sm text-zinc-400 mb-6 font-medium text-center">
              {isLogin ? 'Bem-vindo ao Minha Banda. Faça login para gerenciar sua agenda.' : 'Cadastre-se na banda da qual foi convidado.'}
            </p>
          </>
        )}

        {successMsg ? (
          <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6 text-center w-full">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
            <h2 className="text-lg font-bold text-emerald-400 mb-2">Quase lá!</h2>
            <p className="text-sm text-zinc-300">Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar sua conta e acessar a banda.</p>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] p-2 rounded-lg text-center mb-3 font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
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
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                  Senha
                </label>
                <input 
                  type="password" 
                  name="password" 
                  required 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
                  placeholder="••••••••"
                />
              </div>

              {!isLogin && (
                <div className="flex flex-col gap-1 mt-1 p-2.5 bg-zinc-950/50 border border-zinc-800/80 rounded-lg">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest flex justify-between">
                    Código de Convite da Banda
                  </label>
                  <input 
                    type="text" 
                    name="inviteCode" 
                    required={!isLogin}
                    className="w-full bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-2 mt-1 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
                    placeholder="Ex: BANDA2026"
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-bold py-2.5 mt-2 rounded-lg text-sm transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Autenticando...' : (isLogin ? 'Entrar' : 'Registrar')}
              </button>
            </form>

            <button 
              onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
              type="button"
              className="mt-4 text-xs text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
            >
              {isLogin 
                ? 'Não tem conta? Crie uma aqui.' 
                : 'Já tem conta? Faça login.'}
            </button>

            {!isLogin && (
              <div className="w-full flex flex-col items-center mt-4 pt-4 border-t border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3 font-bold">Ou então</span>
                <button type="button" disabled className="w-full py-2.5 px-3 bg-indigo-600 border border-indigo-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 opacity-60 cursor-not-allowed shadow-md text-sm">
                  ✨ Criar Minha Banda <span className="uppercase text-[8px] tracking-wider ml-1 px-1.5 py-0.5 bg-indigo-800 rounded">(Premium)</span>
                </button>
                <p className="text-[9px] text-zinc-500 font-medium text-center mt-1.5 max-w-[200px] leading-tight">
                  Seja o administrador da sua própria agenda. (Em breve)
                </p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

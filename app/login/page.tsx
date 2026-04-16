'use client';

import { useState } from 'react';
import Image from 'next/image';
import { login, signup } from './actions';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    
    const formData = new FormData(e.currentTarget);
    
    const res = isLogin 
      ? await login(formData)
      : await signup(formData);
      
    if (res?.error) {
      setErrorMsg(res.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center">
        
        <div className="mb-6 relative w-40 h-40">
          <Image 
            src="/logo.svg" 
            alt="Minha Banda Logo" 
            fill
            className="invert brightness-200"
            priority
          />
        </div>
        
        <h1 className="text-2xl font-black text-zinc-50 mb-1 tracking-tight">Minha Banda</h1>
        <p className="text-sm text-zinc-400 mb-8 font-medium">
          {isLogin ? 'Bem-vindo ao Minha Banda. Faça login para gerenciar sua agenda.' : 'Crie sua conta no Minha Banda.'}
        </p>

        {errorMsg && (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg text-center mb-5 font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              E-mail
            </label>
            <input 
              type="email" 
              name="email" 
              required 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
              placeholder="seu@email.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              Senha
            </label>
            <input 
              type="password" 
              name="password" 
              required 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div className="flex flex-col gap-1.5 mt-2 p-3 bg-zinc-950/50 border border-zinc-800/80 rounded-lg">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex justify-between">
                Código de Convite da Banda
              </label>
              <input 
                type="text" 
                name="inviteCode" 
                required={!isLogin}
                className="w-full bg-zinc-900 border border-zinc-700/50 rounded-lg px-4 py-2 mt-1 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
                placeholder="Ex: BANDA2026"
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-bold py-3 mt-4 rounded-lg transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Autenticando...' : (isLogin ? 'Entrar' : 'Registrar')}
          </button>
        </form>

        <button 
          onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
          className="mt-6 text-sm text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
        >
          {isLogin 
            ? 'Não tem conta? Crie uma aqui.' 
            : 'Já tem conta? Faça login.'}
        </button>

      </div>
    </div>
  );
}

import { getUserRole, getUserEmail } from '@/lib/auth';
import { signout } from '@/app/login/actions';
import { LogOut, ShieldAlert, ShieldCheck } from 'lucide-react';

export default async function SettingsPage() {
  const role = await getUserRole();
  const email = await getUserEmail();

  return (
    <div className="flex-1 w-full max-w-lg mx-auto px-4 py-8 md:p-10 relative">
      <header className="mb-10">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-50 mb-2">
          Ajustes
        </h1>
        <p className="text-zinc-400 text-sm md:text-base">
          Gerencie seu perfil e sessão ativa.
        </p>
      </header>

      <main className="flex flex-col gap-8 pb-32">
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 border border-zinc-700">
            <span className="text-xl font-bold uppercase text-zinc-300">
              {email ? email.substring(0, 2) : '??'}
            </span>
          </div>
          
          <h2 className="text-zinc-100 font-bold mb-1">{email}</h2>
          
          <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
            role === 'admin' 
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
          }`}>
            {role === 'admin' ? (
              <><ShieldCheck className="w-3.5 h-3.5" /> GigOps Admin</>
            ) : (
              <><ShieldAlert className="w-3.5 h-3.5" /> Visualizador</>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2 border-t border-zinc-800/50 pt-8 mt-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">
            Sessão
          </h3>
          
          <form action={signout}>
            <button 
              type="submit"
              className="w-full flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors group"
            >
              <div className="flex flex-col text-left">
                <span className="font-bold text-red-500">Sair da Conta</span>
                <span className="text-xs text-red-400/70 font-medium">Encerrar sessão neste dispositivo</span>
              </div>
              <LogOut className="w-5 h-5 text-red-500 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

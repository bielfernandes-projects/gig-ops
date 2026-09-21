import Link from 'next/link';
import type { Metadata } from 'next';
import { CalendarDays, Wallet, BellRing, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Gigueiros — agenda, escala e cachês da sua banda',
  description:
    'Chega de planilha e grupo de WhatsApp. Organize shows, escala de músicos, cachês e lembretes em um app feito para bandas.',
};

const features = [
  { icon: CalendarDays, title: 'Agenda de shows', text: 'Todos os shows num só lugar, com sincronização no Google Agenda e Apple Calendar.' },
  { icon: Users, title: 'Escala de músicos', text: 'Escale a banda, convide os músicos e cada um vê só o que é dele.' },
  { icon: Wallet, title: 'Cachês e pendências', text: 'Saiba quem já recebeu, quem falta pagar e o lucro real de cada show.' },
  { icon: BellRing, title: 'Avisos no celular', text: 'Notificação de escala, cancelamento e lembrete antes do show.' },
];

export default function Landing() {
  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex max-w-3xl flex-col gap-14 px-5 py-16">
        <header className="flex flex-col gap-5">
          <span className="text-sm font-semibold text-emerald-400">Gigueiros</span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            A agenda e o financeiro da sua banda, sem planilha e sem bagunça no WhatsApp.
          </h1>
          <p className="text-lg text-zinc-400">
            Cadastre os shows, escale os músicos, controle os cachês e avise todo mundo, direto do celular.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login" className="rounded-lg bg-emerald-500 px-5 py-3 font-bold text-zinc-950 hover:bg-emerald-400">
              Testar 30 dias grátis
            </Link>
            <Link href="/login" className="rounded-lg border border-zinc-700 px-5 py-3 font-medium hover:bg-zinc-900">
              Já tenho conta
            </Link>
          </div>
          <p className="text-sm text-zinc-500">
            Na tela de entrada, toque em &ldquo;Não tem conta? Crie uma aqui&rdquo; e depois em &ldquo;Seja o administrador da sua própria agenda&rdquo;.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <Icon className="mb-3 h-6 w-6 text-emerald-400" />
              <h2 className="mb-1 font-semibold">{title}</h2>
              <p className="text-sm text-zinc-400">{text}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-1 text-xl font-bold">Preço simples</h2>
          <p className="text-3xl font-bold text-emerald-400">
            R$ 19<span className="text-base font-medium text-zinc-400">/mês por banda</span>
          </p>
          <ul className="mt-4 space-y-1 text-sm text-zinc-400">
            <li>• 30 dias grátis, sem cartão.</li>
            <li>• Músicos ilimitados na sua banda.</li>
            <li>• Pagamento por Pix, combinado direto conosco.</li>
            <li>• Cancele quando quiser.</li>
          </ul>
        </section>

        <footer className="flex gap-4 border-t border-zinc-800 pt-6 text-sm text-zinc-500">
          <Link href="/termos" className="hover:text-zinc-300">Termos de uso</Link>
          <Link href="/privacidade" className="hover:text-zinc-300">Privacidade</Link>
        </footer>
      </main>
    </div>
  );
}

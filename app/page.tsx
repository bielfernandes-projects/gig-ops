import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/logo';
import { Setlist } from '@/components/landing-setlist';

export const metadata: Metadata = {
  title: 'Gigueiros: agenda, escala e cachês da sua banda',
  description:
    'Chega de planilha e grupo de WhatsApp. Organize shows, escala de músicos, cachês e lembretes em um app feito para bandas.',
};

const features = [
  {
    title: 'Agenda de shows',
    text: 'Todos os shows da banda em uma linha do tempo, com sincronização no Google Agenda e no Apple Calendário.',
  },
  {
    title: 'Escala de músicos',
    text: 'Escale quem toca em cada show. O músico recebe o aviso no celular na mesma hora.',
  },
  {
    title: 'Cachês e pendências',
    text: 'Veja quem já recebeu, quem falta pagar e quanto sobrou de cada show.',
  },
  {
    title: 'Lembretes e cancelamentos',
    text: 'Aviso antes do show. Se um show cai, todos os escalados sabem o motivo.',
  },
];

const adminSees = [
  'Financeiro completo: receitas, custos e lucro',
  'Cachê de cada músico e observações do contratante',
  'Músicos, projetos e códigos de convite',
];

const musicianSees = ['Só os shows em que está escalado', 'Só o próprio cachê', 'Nenhum valor dos colegas'];

const priceItems = ['30 dias grátis, sem cartão', 'Músicos ilimitados na banda', 'Pagamento por Pix', 'Cancele quando quiser'];

export default function Landing() {
  return (
    <div className="landing fixed inset-0 z-[999] overflow-y-auto bg-[var(--l-bg)] text-[var(--l-fg)]">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo className="h-auto w-32 sm:w-36" priority />
        <Link
          href="/login"
          className="rounded-md px-3 py-2 text-sm font-semibold underline decoration-2 underline-offset-4 transition-opacity hover:opacity-70"
        >
          Entrar
        </Link>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-24 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-8 lg:pb-32 lg:pt-16">
          <div>
            <h1 className="text-balance text-[clamp(2.5rem,8vw,4.5rem)] lg:text-[clamp(2.5rem,5.2vw,4.5rem)] font-black leading-[0.98] tracking-[-0.035em]">
              A agenda e o caixa da banda num lugar só.
            </h1>
            <p className="mt-6 max-w-md text-lg text-[var(--l-mute)]">
              Shows, escala e cachê de cada músico. Chega de planilha e de grupo de WhatsApp.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/login"
                className="inline-flex items-center rounded-md bg-[var(--l-fg)] px-6 py-3.5 text-base font-bold text-[var(--l-bg)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Testar 30 dias grátis
              </Link>
              <span className="text-sm text-[var(--l-mute)]">Sem cartão de crédito.</span>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end lg:pr-3">
            <Setlist />
          </div>
        </section>

        {/* O que resolve */}
        <section className="border-t-2 border-[var(--l-fg)]">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
            <h2 className="max-w-2xl text-balance text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              Tudo o que o WhatsApp deixava solto.
            </h2>
            <ul className="mt-12 divide-y divide-[var(--l-line)] border-y border-[var(--l-line)]">
              {features.map((f) => (
                <li
                  key={f.title}
                  className="group grid gap-2 py-7 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:gap-10 sm:py-9"
                >
                  <h3 className="text-2xl font-bold tracking-[-0.02em] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-2 sm:text-3xl">
                    {f.title}
                  </h3>
                  <p className="max-w-prose text-pretty text-base text-[var(--l-mute)] sm:text-lg">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Quem vê o quê */}
        <section className="pb-24 lg:pb-36">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 sm:px-8 lg:grid-cols-2">
            <div className="border-2 border-[var(--l-fg)] p-7 sm:p-9">
              <h2 className="text-balance text-2xl font-black tracking-[-0.02em] sm:text-3xl">Quem administra a banda vê tudo.</h2>
              <ul className="mt-6 space-y-3 text-base text-[var(--l-mute)] sm:text-lg">
                {adminSees.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--l-fg)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-2 border-dashed border-[var(--l-fg)] p-7 sm:p-9">
              <h2 className="text-balance text-2xl font-black tracking-[-0.02em] sm:text-3xl">Quem toca vê só o que é seu.</h2>
              <ul className="mt-6 space-y-3 text-base text-[var(--l-mute)] sm:text-lg">
                {musicianSees.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full border border-[var(--l-fg)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Preço */}
        <section className="border-t-2 border-[var(--l-fg)]">
          <div className="mx-auto grid w-full max-w-6xl items-end gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-32">
            <div>
              <p className="text-[clamp(4.5rem,15vw,9rem)] font-black leading-[0.85] tracking-[-0.04em] tabular-nums">R$ 19</p>
              <p className="mt-4 text-xl font-semibold sm:text-2xl">por mês, por banda.</p>
            </div>
            <ul className="space-y-3 text-base sm:text-lg">
              {priceItems.map((item) => (
                <li key={item} className="flex gap-3 border-b border-[var(--l-line)] pb-3">
                  <span aria-hidden className="font-black">+</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-[var(--l-fg)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-10 px-5 py-14 sm:px-8 md:flex-row md:items-end">
          <Logo className="h-auto w-64 sm:w-80" />
          <nav className="flex gap-6 text-sm font-medium text-[var(--l-mute)]">
            <Link href="/termos" className="underline-offset-4 hover:text-[var(--l-fg)] hover:underline">
              Termos de uso
            </Link>
            <Link href="/privacidade" className="underline-offset-4 hover:text-[var(--l-fg)] hover:underline">
              Privacidade
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

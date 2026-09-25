import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/logo';
import { Setlist } from '@/components/landing-setlist';
import { ClickableShot, FeatureCarousel, type Shot } from '@/components/screenshot-lightbox';
import { FOUNDER_LIMIT } from '@/lib/pricing';
import { countFounders } from '@/lib/founders';

export const revalidate = 3600;

const title = 'Gigueiros: agenda, escala e cachês da sua banda';
const description = 'Chega de planilha e grupo de WhatsApp. Organize shows, escala de músicos, cachês, repertório e financeiro em um app feito para bandas.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/' },
  openGraph: { title, description, url: '/' },
  twitter: { title, description },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Gigueiros',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  description,
  url: 'https://gigueiros.com.br',
  offers: {
    '@type': 'Offer',
    price: '49.90',
    priceCurrency: 'BRL',
    priceValidUntil: '2027-12-31',
  },
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
  {
    title: 'Repertório e cifras',
    text: 'Catálogo de músicas da banda com cifra, tom e PDF anexado. Monte repertórios reutilizáveis, marque um como principal e compartilhe por link ou WhatsApp. Toque no modo palco, com letra grande.',
  },
  {
    title: 'Financeiro e rateio',
    text: 'Recibo em PDF para o contratante, controle de sinal e restante, e divisão do lucro entre os sócios da banda.',
  },
];

const dashboardDesktop: Shot = { src: '/screenshots/dashboard-desktop.jpg', alt: 'Dashboard do Gigueiros no computador, com próximo show e gráficos financeiros', width: 1568, height: 652 };
const dashboardTablet: Shot = { src: '/screenshots/dashboard-tablet.png', alt: 'Dashboard do Gigueiros aberto em um tablet', width: 1004, height: 771 };
const dashboardMobile: Shot = { src: '/screenshots/dashboard-mobile.png', alt: 'Dashboard do Gigueiros aberto no celular, com navegação inferior de app', width: 478, height: 771 };

const featureShots: (Shot & { caption: string })[] = [
  { src: '/screenshots/agenda.jpg', alt: 'Agenda de shows do Gigueiros, com o calendário do mês e vários shows marcados', width: 1536, height: 639, caption: 'Agenda' },
  { src: '/screenshots/financeiro.jpg', alt: 'Tela de um show no Gigueiros mostrando cachê bruto, custos e lucro líquido', width: 1536, height: 639, caption: 'Financeiro de cada show' },
  { src: '/screenshots/repertorio.jpg', alt: 'Catálogo de músicas do repertório no Gigueiros', width: 1536, height: 639, caption: 'Repertório' },
  { src: '/screenshots/relatorio.jpg', alt: 'Relatório financeiro mensal do Gigueiros, com faturamento, custos e lucro', width: 1536, height: 639, caption: 'Relatório financeiro' },
  { src: '/screenshots/musicos.jpg', alt: 'Lista de músicos do banco de talentos no Gigueiros', width: 1536, height: 639, caption: 'Músicos' },
];

const adminSees = [
  'Financeiro completo: receitas, custos e lucro',
  'Cachê de cada músico e observações do contratante',
  'Músicos, projetos e códigos de convite',
];

const musicianSees = ['Só os shows em que está escalado', 'Só o próprio cachê', 'Nenhum valor dos colegas'];

const priceItems = ['7 dias grátis, sem cartão', 'Músicos ilimitados na banda', 'Assinatura no cartão de crédito', 'Cancele quando quiser'];

export default async function Landing() {
  const founders = await countFounders();
  const left = Math.max(0, FOUNDER_LIMIT - founders);

  return (
    <div className="landing fixed inset-0 z-[999] overflow-y-auto bg-[var(--l-bg)] text-[var(--l-fg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
                Testar 7 dias grátis
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

        {/* Prints reais */}
        <section className="border-t-2 border-[var(--l-fg)]">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
            <h2 className="max-w-2xl text-balance text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              O app de verdade, sem enrolação.
            </h2>
            <p className="mt-3 max-w-xl text-base text-[var(--l-mute)] sm:text-lg">Clique em qualquer print para ver em tamanho grande.</p>

            <div className="mt-12 grid gap-8 lg:grid-cols-[2fr_1fr_0.75fr] lg:items-end lg:gap-6">
              <ClickableShot shot={dashboardDesktop} device="laptop" sizes="(min-width: 1024px) 50vw, 100vw" />
              <ClickableShot shot={dashboardTablet} device="tablet" sizes="(min-width: 1024px) 20vw, 60vw" />
              <ClickableShot shot={dashboardMobile} device="phone" sizes="(min-width: 1024px) 14vw, 45vw" />
            </div>
            <p className="mt-4 text-sm text-[var(--l-mute)] sm:text-base">
              Computador, tablet ou celular: o mesmo app, sempre com você. Funciona como PWA — instala na tela inicial e abre igual um aplicativo nativo.
            </p>

            <div className="mt-16 max-w-3xl">
              <FeatureCarousel shots={featureShots} />
            </div>
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
              <p className="text-[clamp(4.5rem,15vw,9rem)] font-black leading-[0.85] tracking-[-0.04em] tabular-nums">R$ 49,90</p>
              <p className="mt-4 text-xl font-semibold sm:text-2xl">por mês, por banda.</p>
              {left > 0 && (
                <div className="mt-6 border-2 border-[var(--l-fg)] p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-base sm:text-lg">
                      <strong>Fundadores:</strong> as {FOUNDER_LIMIT} primeiras bandas pagam <strong>R$ 24,90</strong> para sempre.
                    </p>
                    <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-black">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--l-fg)] opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--l-fg)]" />
                      </span>
                      Restam {left}
                    </span>
                  </div>
                  <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[var(--l-line)]" role="progressbar" aria-valuenow={founders} aria-valuemin={0} aria-valuemax={FOUNDER_LIMIT}>
                    <div
                      className="h-full rounded-full bg-[var(--l-fg)] transition-[width] duration-700 ease-out"
                      style={{ width: `${Math.max(4, Math.round((founders / FOUNDER_LIMIT) * 100))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--l-mute)]">{founders} de {FOUNDER_LIMIT} vagas preenchidas</p>
                  <p className="mt-3 border-t border-[var(--l-line)] pt-3 text-sm sm:text-base">
                    Fundadores entram no <strong>grupo de suporte direto comigo</strong> e participam ativamente da construção e da melhoria do app.
                  </p>
                </div>
              )}
              <p className="mt-4 text-sm text-[var(--l-mute)]">Prefere pagar de uma vez? Plano anual: R$ 499,00 (cerca de R$ 41,60 por mês).</p>
              <Link
                href="/login"
                className="mt-8 inline-flex items-center rounded-md bg-[var(--l-fg)] px-6 py-3.5 text-base font-bold text-[var(--l-bg)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Testar 7 dias grátis
              </Link>
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

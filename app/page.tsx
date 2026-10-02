import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/logo';
import { InstagramLink } from '@/components/instagram-link';
import { Setlist } from '@/components/landing-setlist';
import { ClickableShot, type Shot } from '@/components/screenshot-lightbox';
import { FeatureCarousel, type Slide } from '@/components/feature-carousel';
import { FOUNDER_LIMIT, PRICE_TABLE } from '@/lib/pricing';
import { FREELA_LIMITS, IMPORT_QUOTA } from '@/lib/plans';
import { countFounders } from '@/lib/founders';
import { brl } from '@/lib/finance';
import { APP_VERSION } from '@/lib/version';

export const revalidate = 3600;

const title = 'Gigueiros: agenda, escala e cachês para quem toca';
const description =
  'O app para músicos: donos de banda e freelancers organizam gigs, escala, cachês, repertório (importe o seu de um PDF ou Word) e financeiro em um lugar só. Chega de planilha e grupo de WhatsApp.';

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
  offers: [
    { '@type': 'Offer', name: 'Plano Banda', price: String(PRICE_TABLE.banda.principal.monthly), priceCurrency: 'BRL', priceValidUntil: '2027-12-31' },
    { '@type': 'Offer', name: 'Plano Freela', price: String(PRICE_TABLE.freela.principal.monthly), priceCurrency: 'BRL', priceValidUntil: '2027-12-31' },
  ],
};

type Audience = 'Banda e Freela' | 'Só Banda';

const features: { title: string; text: string; for: Audience }[] = [
  {
    title: 'Agenda de gigs',
    text: 'Todas as suas gigs em uma linha do tempo, com sincronização no Google Agenda e no Apple Calendário. Já tem a lista numa planilha ou no WhatsApp? Cole e importe, com prévia antes de salvar.',
    for: 'Banda e Freela',
  },
  {
    title: 'Escala de músicos',
    text: 'Escale quem toca em cada gig. O músico recebe o aviso no celular na mesma hora.',
    for: 'Só Banda',
  },
  {
    title: 'Cachês e pendências',
    text: 'Veja quem já recebeu, quem falta pagar e quanto sobrou de cada gig. No Freela, quanto cada banda ainda te deve.',
    for: 'Banda e Freela',
  },
  {
    title: 'Lembretes e cancelamentos',
    text: 'Aviso antes da gig. Se uma gig cai, todos os escalados sabem o motivo.',
    for: 'Banda e Freela',
  },
  {
    title: 'Repertório e cifras',
    text: 'Catálogo de músicas com links de cifra e letra, tom, tom que começa, observações e arquivos anexados (partitura, cifra). Já tem o repertório em PDF, Word ou TXT? Importe: o app lê o arquivo, cria as músicas e os blocos e você revisa antes de salvar. Monte repertórios reutilizáveis, compartilhe por link ou WhatsApp e abra na gig, com blocos, tons pedidos e observações.',
    for: 'Banda e Freela',
  },
  {
    title: 'Financeiro e rateio',
    text: 'Recibo em PDF para o contratante, controle de sinal e restante, despesas e divisão do lucro entre os sócios da banda.',
    for: 'Só Banda',
  },
];

const importSteps = [
  {
    title: 'Envie o arquivo',
    text: 'O PDF, o Word (DOCX) ou o TXT que você já usa. Pode ser lista, tabela ou blocos: o app entende o formato do seu jeito de anotar.',
  },
  {
    title: 'Revise na tela',
    text: 'Veja o que foi lido, corrija o que precisar e filtre as músicas com nome, tom ou artista faltando. Nada é salvo até você confirmar.',
  },
  {
    title: 'Pronto no catálogo',
    text: 'As músicas entram no catálogo e o repertório é criado com os blocos do seu documento. O que o arquivo não trazia fica em branco, para você completar aos poucos.',
  },
];

const dashboardDesktop: Shot = { src: '/screenshots/dashboard-desktop.jpg', alt: 'Dashboard do Gigueiros no computador, com próxima gig e gráficos financeiros', width: 1568, height: 652 };
const dashboardTablet: Shot = { src: '/screenshots/dashboard-tablet.png', alt: 'Dashboard do Gigueiros aberto em um tablet', width: 1004, height: 771 };
const dashboardMobile: Shot = { src: '/screenshots/dashboard-mobile.png', alt: 'Dashboard do Gigueiros aberto no celular, com navegação inferior de app', width: 478, height: 771 };

const slides: Slide[] = [
  { src: '/screenshots/agenda.jpg', alt: 'Agenda de gigs do Gigueiros, com o calendário do mês e várias gigs marcadas', width: 1536, height: 639, caption: 'Agenda', blurb: 'O mês inteiro de gigs, em calendário ou em lista, com o seu cachê em cada uma.' },
  { src: '/screenshots/financeiro.jpg', alt: 'Tela de uma gig no Gigueiros mostrando cachê bruto, custos e lucro líquido', width: 1536, height: 639, caption: 'Financeiro de cada gig', blurb: 'Cachê, custos e lucro da gig, e quem já recebeu.' },
  { src: '/screenshots/repertorio.jpg', alt: 'Catálogo de músicas do repertório no Gigueiros', width: 1536, height: 639, caption: 'Repertório', blurb: 'Catálogo com tom, cifra e letra, e repertórios prontos para qualquer gig.' },
  { src: '/screenshots/relatorio.jpg', alt: 'Relatório financeiro mensal do Gigueiros, com faturamento, custos e lucro', width: 1536, height: 639, caption: 'Relatório', blurb: 'Faturamento, custos e lucro por mês. No Freela, quanto cada banda te pagou.' },
  { src: '/screenshots/musicos.jpg', alt: 'Lista de músicos do banco de talentos no Gigueiros', width: 1536, height: 639, caption: 'Músicos', blurb: 'A equipe da banda com instrumento e contato, para escalar em dois toques.' },
];

const bandaFeatures = [
  'Escala de músicos, com aviso no celular',
  'Cachê de cada um e o que falta pagar',
  'Despesas, som e recibo em PDF',
  'Divisão do lucro entre os sócios',
  'Repertório e catálogo sem limite',
];

const freelaFeatures = [
  'Todas as suas gigs numa agenda, com Google Agenda',
  'Um projeto por banda: quanto cada uma te pagou',
  'Cachê a receber e recebido, mês a mês',
  `Até ${FREELA_LIMITS.songs} músicas em ${FREELA_LIMITS.setlists} repertórios`,
];

const adminSees = [
  'Financeiro completo: receitas, custos e lucro',
  'Cachê de cada músico e observações do contratante',
  'Músicos, projetos e códigos de convite',
];

const musicianSees = ['Só as gigs em que está escalado', 'Só o próprio cachê', 'Nenhum valor dos colegas'];

const priceFacts = [
  '7 dias grátis na primeira conta, sem cartão',
  'Músicos ilimitados na banda',
  `${IMPORT_QUOTA} importações por IA por mês em cada conta`,
  'Assinatura no cartão de crédito, cancele quando quiser',
];

const cta =
  'inline-flex items-center rounded-md bg-[var(--l-fg)] px-6 py-3.5 text-base font-bold text-[var(--l-bg)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]';

export default async function Landing() {
  const founders = await countFounders();
  const left = Math.max(0, FOUNDER_LIMIT - founders);
  const banda = PRICE_TABLE.banda;
  const freela = PRICE_TABLE.freela;

  return (
    <div className="landing fixed inset-0 z-[999] overflow-y-auto bg-[var(--l-bg)] text-[var(--l-fg)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo className="h-auto w-32 sm:w-36" priority />
        <nav className="flex items-center gap-1 sm:gap-3">
          <a href="#planos" className="hidden rounded-md px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-70 sm:inline-block">
            Planos
          </a>
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-semibold underline decoration-2 underline-offset-4 transition-opacity hover:opacity-70"
          >
            Entrar
          </Link>
          <Link
            href="/login?cadastro=1"
            className="rounded-md bg-[var(--l-fg)] px-4 py-2 text-sm font-bold text-[var(--l-bg)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-24 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-8 lg:pb-32 lg:pt-16">
          <div>
            <h1 className="text-balance text-[clamp(2.5rem,8vw,4.5rem)] lg:text-[clamp(2.5rem,5.2vw,4.5rem)] font-black leading-[0.98] tracking-[-0.035em]">
              O app de quem vive de tocar.
            </h1>
            <p className="mt-6 max-w-md text-lg text-[var(--l-mute)]">
              Dono de banda ou freela: gigs, escala e cachês num lugar só. Chega de planilha e de grupo de WhatsApp.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/login?cadastro=1" className={cta}>
                Testar 7 dias grátis
              </Link>
              <a href="#planos" className="text-sm font-semibold underline decoration-2 underline-offset-4 transition-opacity hover:opacity-70">
                Ver os planos
              </a>
            </div>
            <p className="mt-4 text-sm text-[var(--l-mute)]">Sem cartão de crédito.</p>
          </div>
          <div className="flex justify-center pr-2 sm:pr-0 lg:justify-end lg:pr-3">
            <Setlist />
          </div>
        </section>

        {/* Para quem é */}
        <section id="para-quem" className="border-t-2 border-[var(--l-fg)]">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
            <h2 className="max-w-3xl text-balance text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              Feito para músico. Do jeito que você toca.
            </h2>
            <p className="mt-4 max-w-2xl text-pretty text-base text-[var(--l-mute)] sm:text-lg">
              O Gigueiros é só para quem toca: quem tem uma banda para tocar e quem toca para várias. Cada um tem a sua conta, com o que precisa e nada a mais.
            </p>

            <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-10">
              <div className="border-2 border-[var(--l-fg)] bg-[var(--l-card)] p-7 shadow-[5px_5px_0_var(--l-fg)] sm:p-9 sm:shadow-[8px_8px_0_var(--l-fg)]">
                <h3 className="text-2xl font-black tracking-[-0.02em] sm:text-3xl">Dono de banda</h3>
                <p className="mt-2 text-lg font-semibold">Você escala, paga e divide.</p>
                <ul className="mt-6 space-y-3 text-base sm:text-lg">
                  {bandaFeatures.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--l-fg)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-7 border-t border-[var(--l-line)] pt-4 text-sm text-[var(--l-mute)]">
                  Plano <strong className="text-[var(--l-fg)]">Banda</strong>, a partir de {brl(banda.principal.monthly)} por mês.
                </p>
              </div>

              <div className="border-2 border-dashed border-[var(--l-fg)] p-7 sm:p-9">
                <h3 className="text-2xl font-black tracking-[-0.02em] sm:text-3xl">Músico freela</h3>
                <p className="mt-2 text-lg font-semibold">Você toca em várias bandas e quer saber quanto cada uma te deve.</p>
                <ul className="mt-6 space-y-3 text-base sm:text-lg">
                  {freelaFeatures.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full border border-[var(--l-fg)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-[var(--l-mute)]">Sem equipe e sem escala: só o que é seu.</p>
                <p className="mt-7 border-t border-[var(--l-line)] pt-4 text-sm text-[var(--l-mute)]">
                  Plano <strong className="text-[var(--l-fg)]">Freela</strong>, {brl(freela.principal.monthly)} por mês.
                </p>
              </div>
            </div>

            <p className="mt-8 border-l-0 border-t-2 border-[var(--l-fg)] pt-5 text-base sm:text-lg">
              <strong>Foi convidado por uma banda?</strong> Entra de graça com o código de convite e vê só as suas gigs e o seu cachê.
            </p>
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
                  <div>
                    <h3 className="text-2xl font-bold tracking-[-0.02em] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-2 sm:text-3xl">
                      {f.title}
                    </h3>
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${f.for === 'Só Banda' ? 'border border-[var(--l-fg)] text-[var(--l-fg)]' : 'border border-dashed border-[var(--l-mute)] text-[var(--l-mute)]'}`}
                    >
                      {f.for}
                    </span>
                  </div>
                  <p className="max-w-prose text-pretty text-base text-[var(--l-mute)] sm:text-lg">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Importar repertório */}
        <section className="border-t-2 border-[var(--l-fg)]">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
            <h2 className="max-w-3xl text-balance text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              Seu repertório já existe. Traga ele pra cá.
            </h2>
            <p className="mt-4 max-w-2xl text-pretty text-base text-[var(--l-mute)] sm:text-lg">
              Sem digitar música por música: o app lê o PDF, o Word ou o TXT que você já tem e monta o catálogo e os blocos do jeito que estão.
            </p>
            <ol className="mt-12 grid gap-6 lg:grid-cols-3">
              {importSteps.map((step, i) => (
                <li key={step.title} className="border-2 border-[var(--l-fg)] p-6 sm:p-7">
                  <span aria-hidden className="text-4xl font-black tabular-nums tracking-[-0.04em]">0{i + 1}</span>
                  <h3 className="mt-3 text-xl font-bold tracking-[-0.02em] sm:text-2xl">{step.title}</h3>
                  <p className="mt-2 text-pretty text-base text-[var(--l-mute)]">{step.text}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 max-w-2xl text-sm text-[var(--l-mute)]">
              A leitura é feita por inteligência artificial e não inventa: tom ou artista que o arquivo não diz ficam vazios. PDF escaneado (foto do papel) ainda não é lido.
            </p>
          </div>
        </section>

        {/* Prints reais */}
        <section className="border-t-2 border-[var(--l-fg)]">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
            <h2 className="max-w-2xl text-balance text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              O app de verdade, sem enrolação.
            </h2>
            <p className="mt-3 max-w-xl text-base text-[var(--l-mute)] sm:text-lg">Clique em qualquer print para ver em tamanho grande.</p>

            <div className="mt-12 grid gap-8 lg:grid-cols-[2fr_1fr_0.75fr] lg:items-center lg:gap-6">
              <ClickableShot shot={dashboardDesktop} device="laptop" sizes="(min-width: 1024px) 50vw, 100vw" />
              <ClickableShot shot={dashboardTablet} device="tablet" sizes="(min-width: 1024px) 20vw, 60vw" />
              <ClickableShot shot={dashboardMobile} device="phone" sizes="(min-width: 1024px) 14vw, 45vw" />
            </div>
            <p className="mt-4 text-sm text-[var(--l-mute)] sm:text-base">
              Computador, tablet ou celular: o mesmo app, sempre com você. Funciona como PWA: instala na tela inicial e abre igual um aplicativo nativo.
            </p>

            <div className="mt-16 w-full">
              <FeatureCarousel slides={slides} />
            </div>
          </div>
        </section>

        {/* Quem vê o quê */}
        <section className="pb-16 lg:pb-24">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 sm:px-8 lg:grid-cols-2">
            <div className="border-2 border-[var(--l-fg)] p-7 sm:p-9">
              <h2 className="text-balance text-2xl font-black tracking-[-0.02em] sm:text-3xl lg:min-h-[2.4em]">Quem administra a banda vê tudo.</h2>
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
              <h2 className="text-balance text-2xl font-black tracking-[-0.02em] sm:text-3xl lg:min-h-[2.4em]">Quem toca vê só o que é seu.</h2>
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

        {/* Planos */}
        <section id="planos" className="border-t-2 border-[var(--l-fg)]">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
            <h2 className="max-w-3xl text-balance text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              Dois planos. Um é do seu tamanho.
            </h2>

            <div className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-10">
              {/* Banda */}
              <div className="border-2 border-[var(--l-fg)] bg-[var(--l-card)] p-7 shadow-[5px_5px_0_var(--l-fg)] sm:p-9 sm:shadow-[8px_8px_0_var(--l-fg)]">
                <h3 className="text-2xl font-black tracking-[-0.02em]">Banda</h3>
                <p className="mt-4 whitespace-nowrap text-[clamp(3.5rem,13vw,6rem)] font-black leading-[0.9] tracking-[-0.04em] tabular-nums">{brl(banda.principal.monthly)}</p>
                <p className="mt-3 text-lg font-semibold">por mês, por banda.</p>
                <p className="mt-1 text-sm text-[var(--l-mute)]">Ou {brl(banda.principal.annual)} por ano, cerca de {brl(banda.principal.annual / 12)} por mês.</p>

                <ul className="mt-6 space-y-2.5 text-base">
                  {[...bandaFeatures, 'Músicos ilimitados na banda'].map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden className="font-black">+</span>
                      {item}
                    </li>
                  ))}
                </ul>

                {left > 0 && (
                  <div className="mt-7 border-2 border-[var(--l-fg)] p-4 sm:p-5">
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
              </div>

              {/* Freela */}
              <div className="border-2 border-dashed border-[var(--l-fg)] p-7 sm:p-9">
                <h3 className="text-2xl font-black tracking-[-0.02em]">Freela</h3>
                <p className="mt-4 whitespace-nowrap text-[clamp(3.5rem,13vw,6rem)] font-black leading-[0.9] tracking-[-0.04em] tabular-nums lg:text-[clamp(3rem,5.6vw,5rem)]">{brl(freela.principal.monthly)}</p>
                <p className="mt-3 text-lg font-semibold">por mês.</p>
                <p className="mt-1 text-sm text-[var(--l-mute)]">Ou {brl(freela.principal.annual)} por ano, cerca de {brl(freela.principal.annual / 12)} por mês.</p>

                <ul className="mt-6 space-y-2.5 text-base">
                  {freelaFeatures.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden className="font-black">+</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-sm text-[var(--l-mute)]">Não tem equipe, escala, despesas nem divisão de lucro. Para isso, é o plano Banda.</p>
                <p className="mt-2 text-sm text-[var(--l-mute)]">Quando virar dono de uma banda, é só subir para o plano Banda e levar suas gigs junto.</p>
              </div>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-16">
              <div>
                <h3 className="text-xl font-bold tracking-[-0.02em] sm:text-2xl">Tem mais de uma conta?</h3>
                <p className="mt-2 max-w-prose text-base text-[var(--l-mute)]">
                  A conta mais cara paga o preço cheio. Cada outra conta custa menos: Banda extra por {brl(banda.adesao.monthly)} por mês, Freela extra por {brl(freela.adesao.monthly)} por mês. O teste grátis vale só para a primeira.
                </p>
              </div>
              <ul className="space-y-3 text-base sm:text-lg">
                {priceFacts.map((item) => (
                  <li key={item} className="flex gap-3 border-b border-[var(--l-line)] pb-3">
                    <span aria-hidden className="font-black">+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10">
              <Link href="/login?cadastro=1" className={cta}>
                Testar 7 dias grátis
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-[var(--l-fg)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-10 px-5 py-14 sm:px-8 md:flex-row md:items-end">
          <Logo className="h-auto w-64 sm:w-80" />
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-[var(--l-mute)]">
            <Link href="/termos" className="underline-offset-4 hover:text-[var(--l-fg)] hover:underline">
              Termos de uso
            </Link>
            <Link href="/privacidade" className="underline-offset-4 hover:text-[var(--l-fg)] hover:underline">
              Privacidade
            </Link>
            <Link href="/suporte" className="underline-offset-4 hover:text-[var(--l-fg)] hover:underline">
              Ajuda e suporte
            </Link>
            <InstagramLink className="underline-offset-4 hover:text-[var(--l-fg)]" iconClassName="h-5 w-5" />
            <span aria-label={`Versão ${APP_VERSION}`}>v{APP_VERSION}</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}

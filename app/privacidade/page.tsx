import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/contact';

export const metadata = { title: 'Privacidade — Gigueiros' };

export default function Privacidade() {
  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto bg-zinc-950 text-zinc-300">
      <main className="mx-auto max-w-2xl space-y-4 px-5 py-12 text-sm leading-relaxed">
        <Link href="/" className="text-emerald-400">← Voltar</Link>
        <h1 className="text-2xl font-bold text-zinc-100">Política de privacidade</h1>

        <h2 className="font-semibold text-zinc-100">Quem é o responsável</h2>
        <p>O responsável pelo tratamento dos seus dados (controlador, pela LGPD) é Gabriel Fernandes, pessoa física, criador do Gigueiros. Contato para qualquer assunto de privacidade: <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-400">{CONTACT_EMAIL}</a>.</p>

        <h2 className="font-semibold text-zinc-100">Dados que coletamos</h2>
        <p>Conta: e-mail e senha (guardada de forma criptografada) ou, se você entrar com o Google, seu e-mail e nome de perfil. Uso do app: o que você e sua banda cadastram (gigs, locais, músicos, telefone e e-mail de músicos, cachês, repertório, cifras, links e PDFs). Notificações: se você ativar, o identificador do seu dispositivo para enviar avisos push. Cobrança: o Stripe processa o pagamento e nos devolve apenas identificadores da assinatura e datas; o número do seu cartão nunca passa pelos nossos servidores. Importação de repertório: o arquivo que você envia (PDF, Word ou TXT) é lido na hora e não fica guardado; o texto dele é enviado ao Google (Gemini) para identificar as músicas e, no plano gratuito do Google, esse conteúdo pode ser usado por eles para melhorar seus produtos, por isso não envie dados pessoais. Telemetria: registramos quais telas e ações principais são usadas (sem o conteúdo do que você cadastra) para entender e melhorar o produto.</p>

        <h2 className="font-semibold text-zinc-100">Para que usamos</h2>
        <p>Para o funcionamento do app: exibir a agenda, calcular valores, enviar avisos e e-mails da conta (confirmação e recuperação de senha), cobrar a assinatura e dar suporte. A base legal é a execução do contrato de uso do serviço e, no caso da telemetria, nosso legítimo interesse em melhorar o produto. Não vendemos seus dados nem os compartilhamos para publicidade.</p>

        <h2 className="font-semibold text-zinc-100">Quem vê o quê</h2>
        <p>Os dados de uma banda ficam isolados das demais. O músico convidado vê as gigs em que está escalado, sem os cachês dos colegas nem observações contratuais. Links públicos de repertório e de calendário (.ics) mostram o conteúdo a quem tiver o link, então não os compartilhe com quem não deve ver.</p>

        <h2 className="font-semibold text-zinc-100">Com quem compartilhamos</h2>
        <p>Apenas com prestadores necessários para o serviço funcionar: Supabase (banco de dados e login, com dados hospedados em São Paulo), Vercel (hospedagem e métricas de acesso), Stripe (pagamentos), Resend (envio de e-mails da conta) e Google (login, se você escolher, e leitura por IA dos documentos de repertório e das listas de gigs que você decidir importar). Alguns deles podem processar dados fora do Brasil, sempre sob contratos que exigem proteção adequada.</p>

        <h2 className="font-semibold text-zinc-100">Cookies</h2>
        <p>Usamos apenas cookies essenciais: manter você logado e lembrar qual banda você está usando. Não usamos cookies de publicidade.</p>

        <h2 className="font-semibold text-zinc-100">Por quanto tempo guardamos</h2>
        <p>Enquanto sua conta existir. Se você pedir a exclusão, apagamos ou anonimizamos seus dados, salvo o que a lei exigir que guardemos (como registros de cobrança). Bandas sem assinatura ativa têm os dados mantidos por 30 dias em modo somente leitura.</p>

        <h2 className="font-semibold text-zinc-100">Seus direitos (LGPD)</h2>
        <p>Você pode pedir a qualquer momento confirmação de tratamento, acesso, correção, exportação e exclusão dos seus dados, além de retirar consentimentos e se opor a tratamentos. Escreva para {CONTACT_EMAIL}; respondemos em até 15 dias. Se achar que seus direitos não foram respeitados, você também pode procurar a Autoridade Nacional de Proteção de Dados (ANPD).</p>

        <p className="text-zinc-500">Última atualização: 28 de setembro de 2026. Veja também os <Link href="/termos" className="text-emerald-400">termos de uso</Link>.</p>
      </main>
    </div>
  );
}

'use server';

import { CONTACT_EMAIL } from '@/lib/contact';
import { getUserInfo } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Support form -> e-mail to CONTACT_EMAIL via the Resend API (plain fetch, no SDK). Works logged in or out.
 * ponytail: honeypot + size limits only; add a per-IP/user rate limit if the form gets abused.
 */
export async function sendSupportMessage(formData: FormData): Promise<{ success: true } | { error: string }> {
  // Honeypot: real people never fill this hidden field. Pretend success so bots learn nothing.
  if (formData.get('website')) return { success: true };

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  if (!name || name.length > 100) return { error: 'Informe seu nome.' };
  if (!EMAIL_RE.test(email) || email.length > 200) return { error: 'Informe um e-mail válido para a resposta.' };
  if (message.length < 10) return { error: 'Conte um pouco mais para conseguirmos ajudar.' };
  if (message.length > 4000) return { error: 'A mensagem está longa demais (máximo 4000 caracteres).' };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { error: 'O envio de mensagens ainda não está disponível. Escreva para ' + CONTACT_EMAIL + '.' };

  const info = await getUserInfo();
  const account = info.userId ? `${info.email ?? '—'} (banda: ${info.bandName ?? '—'})` : 'visitante (sem login)';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Gigueiros Suporte <naoresponda@gigueiros.com.br>',
      to: [CONTACT_EMAIL],
      reply_to: email,
      subject: `[Suporte Gigueiros] ${name}`,
      html: `<p><strong>De:</strong> ${esc(name)} &lt;${esc(email)}&gt;<br><strong>Conta:</strong> ${esc(account)}</p><p style="white-space:pre-wrap">${esc(message)}</p>`,
      text: `De: ${name} <${email}>\nConta: ${account}\n\n${message}`,
    }),
  });

  if (!res.ok) {
    console.error('Resend error:', res.status, await res.text().catch(() => ''));
    return { error: 'Não foi possível enviar agora. Tente de novo em instantes ou escreva para ' + CONTACT_EMAIL + '.' };
  }
  return { success: true };
}

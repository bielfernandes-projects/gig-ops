import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Acesso ao painel de produto (`/admin`), em duas camadas.
 *
 * 1. **Quem pode:** a lista de e-mails vem de `ADMIN_EMAILS` (separada por vírgula). Fica em env e
 *    não no banco de propósito — o painel apaga contas e bandas, então não pode existir caminho de
 *    escalada por dados, nem uma coluna `is_admin` que um bug de escrita marque.
 * 2. **Senha de novo na entrada (step-up):** estar logado no app não basta. Ao entrar no painel a
 *    senha é pedida outra vez e o resultado vira um cookie de sessão assinado — some quando o
 *    navegador fecha, e expira sozinho em `ELEVATION_MINUTES` num navegador que nunca fecha.
 *
 * A senha em si nunca aparece aqui: quem guarda é o Supabase (com hash), e a conferência é um
 * `signInWithPassword` num cliente descartável (ver `app/admin/entrar/actions.ts`).
 */

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export const ADMIN_COOKIE = 'gg_admin';

/** Quanto tempo a senha vale antes de ser pedida de novo, mesmo com o navegador aberto. */
export const ELEVATION_MINUTES = 60;

function secret(): string | null {
  const value = process.env.ADMIN_SESSION_SECRET;
  // Sem segredo não há como assinar, e sem assinatura o cookie seria forjável: falha fechado.
  return value && value.length >= 16 ? value : null;
}

/** Token `<userId>.<expiraEm>.<hmac>`. O userId entra na assinatura pra o cookie não servir a outra conta. */
export function signElevation(userId: string): string | null {
  const key = secret();
  if (!key) return null;
  const expiresAt = Date.now() + ELEVATION_MINUTES * 60_000;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${createHmac('sha256', key).update(payload).digest('hex')}`;
}

export function verifyElevation(token: string | undefined, userId: string | null): boolean {
  const key = secret();
  if (!key || !token || !userId) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [tokenUserId, expiresAtRaw, mac] = parts;
  if (tokenUserId !== userId) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = createHmac('sha256', key).update(`${tokenUserId}.${expiresAtRaw}`).digest('hex');
  // Comparação de tempo constante: um `===` aqui vaza o prefixo correto byte a byte.
  const a = Buffer.from(mac, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

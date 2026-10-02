/**
 * Nome da banda digitado em /login antes de "Continuar com Google". O OAuth é um redirecionamento
 * pro Google e de volta, então o nome viaja num cookie curto (10 min) que o /auth/callback lê pra
 * criar a banda de uma conta nova sem passar pelo /onboarding.
 */
export const PENDING_BAND_COOKIE = 'gig_pending_band';
export const PENDING_BAND_MAX_AGE = 60 * 10;
/** Tipo de conta escolhido em /login junto do nome ('banda' | 'freela'). */
export const PENDING_KIND_COOKIE = 'gig_pending_kind';

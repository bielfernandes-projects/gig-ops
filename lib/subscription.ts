export type SubscriptionRow = {
  status: 'trial' | 'active' | 'expired';
  trial_ends_at: string;
  paid_until: string | null;
};

export type SubscriptionState = {
  state: 'trial' | 'active' | 'expired';
  /** Days left in the trial (only while state === 'trial'). */
  daysLeft: number | null;
  /** Raw dates, for display in the profile's subscription card. */
  trialEndsAt: string | null;
  paidUntil: string | null;
};

/** How close the trial's end has to be before the app starts warning about it. */
export const TRIAL_WARNING_DAYS = 7;

const DAY_MS = 86_400_000;

/** Effective state of a band's subscription. A missing row is treated as trial so a data bug never locks a band out. */
export function subscriptionState(sub: SubscriptionRow | null, now: Date = new Date()): SubscriptionState {
  if (!sub) return { state: 'trial', daysLeft: null, trialEndsAt: null, paidUntil: null };
  const dates = { trialEndsAt: sub.trial_ends_at, paidUntil: sub.paid_until };

  if (sub.status === 'active') {
    const expired = sub.paid_until !== null && new Date(sub.paid_until) < now;
    return { state: expired ? 'expired' : 'active', daysLeft: null, ...dates };
  }

  if (sub.status === 'trial') {
    const ms = new Date(sub.trial_ends_at).getTime() - now.getTime();
    return ms > 0 ? { state: 'trial', daysLeft: Math.ceil(ms / DAY_MS), ...dates } : { state: 'expired', daysLeft: null, ...dates };
  }

  return { state: 'expired', daysLeft: null, ...dates };
}

/**
 * What the app does about the "Premium desbloqueado" notice for one Banda. `seenAt` is
 * `subscriptions.premium_seen_at`: set once the Dono was told. Leaving Premium clears it, so the
 * next activation (Stripe, admin panel or a direct database change) tells them again.
 */
export function premiumNoticeAction(state: SubscriptionState['state'], seenAt: string | null): 'show' | 'reset' | 'none' {
  if (state === 'active') return seenAt ? 'none' : 'show';
  return seenAt ? 'reset' : 'none';
}

// ─── How the state is shown ─────────────────────────────────────────────────
// The wording and the "warn at N days" threshold used to live in JSX — three differently-worded
// renderers of the same three states, each with its own copy of the rule. They belong next to the
// state machine that produces the states.

export type Tone = 'neutral' | 'warning' | 'danger';

/** The banner a Dono should see about their Banda's Assinatura, or null when there is nothing to say. */
export function subscriptionNotice(sub: Pick<SubscriptionState, 'state' | 'daysLeft'> | null): { tone: Tone; text: string } | null {
  if (!sub) return null;
  if (sub.state === 'expired') {
    return {
      tone: 'danger',
      text: 'A assinatura desta banda expirou. Seus dados estão preservados, mas a edição está bloqueada até a renovação.',
    };
  }
  if (sub.state === 'trial' && sub.daysLeft !== null && sub.daysLeft <= TRIAL_WARNING_DAYS) {
    return { tone: 'warning', text: `Seu teste grátis termina em ${sub.daysLeft} ${sub.daysLeft === 1 ? 'dia' : 'dias'}.` };
  }
  return null;
}

/** The short status line: what state the Assinatura is in, said once. */
export function subscriptionLabel(sub: Pick<SubscriptionState, 'state' | 'daysLeft'> | null): { tone: Tone; text: string } | null {
  if (!sub) return null;
  if (sub.state === 'active') return { tone: 'neutral', text: 'Assinatura ativa' };
  if (sub.state === 'trial') {
    return {
      tone: 'warning',
      text: sub.daysLeft
        ? `Teste grátis: ${sub.daysLeft} ${sub.daysLeft === 1 ? 'dia restante' : 'dias restantes'}`
        : 'Teste grátis',
    };
  }
  return { tone: 'danger', text: 'Assinatura expirada: dados preservados, edição bloqueada' };
}

/**
 * What a Dono can do about billing. `comped` is an Assinatura released by hand rather than paid by
 * card — the admin panel used to re-derive this from the absence of a Stripe id.
 */
export function subscriptionPlan(sub: Pick<SubscriptionState, 'state'> | null, hasStripe: boolean) {
  const state = sub?.state ?? 'trial';
  return {
    /** Active without a card behind it: courtesy access, with or without an end date. */
    comped: state === 'active' && !hasStripe,
    /** Worth offering checkout: nothing is being charged yet. */
    canCheckout: !hasStripe,
    /** There is a Stripe subscription to manage or cancel. */
    canCancel: hasStripe,
  };
}

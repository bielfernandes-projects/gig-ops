export type SubscriptionRow = {
  status: 'trial' | 'active' | 'expired';
  trial_ends_at: string;
  paid_until: string | null;
};

export type SubscriptionState = {
  state: 'trial' | 'active' | 'expired';
  /** Days left in the trial (only while state === 'trial'). */
  daysLeft: number | null;
};

const DAY_MS = 86_400_000;

/** Effective state of a band's subscription. A missing row is treated as trial so a data bug never locks a band out. */
export function subscriptionState(sub: SubscriptionRow | null, now: Date = new Date()): SubscriptionState {
  if (!sub) return { state: 'trial', daysLeft: null };

  if (sub.status === 'active') {
    const expired = sub.paid_until !== null && new Date(sub.paid_until) < now;
    return { state: expired ? 'expired' : 'active', daysLeft: null };
  }

  if (sub.status === 'trial') {
    const ms = new Date(sub.trial_ends_at).getTime() - now.getTime();
    return ms > 0 ? { state: 'trial', daysLeft: Math.ceil(ms / DAY_MS) } : { state: 'expired', daysLeft: null };
  }

  return { state: 'expired', daysLeft: null };
}

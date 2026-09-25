import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe, syncSubscription } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get('stripe-signature');
  if (!secret || !signature) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // The payload only tells us which subscription changed; its state is re-read from Stripe.
  let subscriptionId: string | null = null;
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.mode === 'subscription' && session.subscription) {
      subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
    }
  } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    subscriptionId = event.data.object.id;
  }

  if (subscriptionId) {
    try {
      await syncSubscription(await stripe().subscriptions.retrieve(subscriptionId));
    } catch {
      return NextResponse.json({ error: 'Sync failed' }, { status: 500 }); // Stripe retries
    }
  }

  return NextResponse.json({ received: true });
}

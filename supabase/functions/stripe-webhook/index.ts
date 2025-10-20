// Supabase Edge Function: stripe-webhook
// Handles Stripe events to update blink_subscriptions

import Stripe from 'stripe'

export const config = {
  runtime: 'edge',
}

async function upsertSubscription(user_id: string, plan: 'free' | 'pro', status: string, current_period_end?: number) {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blink_subscriptions`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      user_id,
      plan,
      status,
      current_period_end: current_period_end ? new Date(current_period_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }),
  })
  if (!res.ok) {
    console.error('Failed to upsert subscription', await res.text())
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) return new Response('Stripe env missing', { status: 500 })

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') as string

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const user_id = session.metadata?.user_id as string
        const subId = session.subscription as string
        if (user_id && subId) {
          const subscription = await stripe.subscriptions.retrieve(subId)
          await upsertSubscription(
            user_id,
            'pro',
            subscription.status,
            subscription.current_period_end
          )
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const user_id = (sub.metadata?.user_id as string) || ''
        if (user_id) {
          await upsertSubscription(
            user_id,
            sub.status === 'canceled' ? 'free' : 'pro',
            sub.status,
            sub.current_period_end
          )
        }
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = invoice.subscription as string
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId)
          const user_id = (sub.metadata?.user_id as string) || ''
          if (user_id) {
            await upsertSubscription(user_id, 'pro', 'past_due', sub.current_period_end)
          }
        }
        break
      }
      default:
        break
    }
  } catch (e: any) {
    console.error('Webhook handling error', e?.message)
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
}



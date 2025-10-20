// Supabase Edge Function: stripe-create-checkout
// POST JSON: { user_id: string, email?: string, price_id: string, success_url?: string, cancel_url?: string }
// Returns: { url: string }

import Stripe from 'stripe'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const { user_id, email, price_id, success_url, cancel_url } = body || {}

    if (!user_id || !price_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id or price_id' }), { status: 400 })
    }

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 })
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: success_url || `${new URL(req.url).origin}/dashboard/settings?state=success`,
      cancel_url: cancel_url || `${new URL(req.url).origin}/dashboard/settings?state=cancel`,
      customer_email: email,
      metadata: {
        user_id,
      },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Failed to create checkout session' }), { status: 500 })
  }
}



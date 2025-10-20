// Supabase Edge Function: stripe-create-portal
// POST JSON: { customer_id: string, return_url?: string }
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
    const { customer_id, return_url } = body || {}

    if (!customer_id) {
      return new Response(JSON.stringify({ error: 'Missing customer_id' }), { status: 400 })
    }

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 })
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

    const portal = await stripe.billingPortal.sessions.create({
      customer: customer_id,
      return_url: return_url || `${new URL(req.url).origin}/dashboard/settings`,
    })

    return new Response(JSON.stringify({ url: portal.url }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Failed to create portal session' }), { status: 500 })
  }
}



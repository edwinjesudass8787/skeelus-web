import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }

    const { sessionId, title } = await request.json()

    if (!sessionId || !title) {
      return NextResponse.json({ error: 'Missing sessionId or title' }, { status: 400 })
    }

    // Get site URL for redirect
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Skeelus Course Access',
              description: `Access to: ${title}`,
            },
            unit_amount: 2990, // $29.90
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}/session/${sessionId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/session/${sessionId}?payment=cancelled`,
      metadata: {
        sessionId,
        userId: user.id,
      },
      client_reference_id: sessionId,
    })

    // Store checkout session ID in Supabase payments table
    await supabase
      .from('learnr_payments')
      .update({ stripe_checkout_session_id: checkoutSession.id })
      .eq('user_id', user.id)
      .eq('session_id', sessionId)

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error('Checkout session error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
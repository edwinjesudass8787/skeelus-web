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

    const { checkoutSessionId } = await request.json()

    if (!checkoutSessionId) {
      return NextResponse.json({ error: 'Missing checkoutSessionId' }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId)

    const status = session.payment_status === 'paid' ? 'paid' : 'not_paid'
    const receiptUrl = session.payment_status === 'paid' ? session.receipt_email : null

    // Update the payment row in Supabase
    await supabase
      .from('learnr_payments')
      .update({
        status: status === 'paid' ? 'paid' : 'pending',
        receipt_url: receiptUrl,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
      })
      .eq('user_id', user.id)
      .eq('stripe_checkout_session_id', checkoutSessionId)

    return NextResponse.json({
      status,
      sessionId: session.id,
      receiptUrl
    })
  } catch (error: any) {
    console.error('Verify checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
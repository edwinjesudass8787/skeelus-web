import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    // Get the payment row
    const { data: payment, error } = await supabase
      .from('learnr_payments')
      .select('stripe_checkout_session_id, status, receipt_url')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .maybeSingle()

    if (error) throw error

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // If already marked as paid, return success
    if (payment.status === 'paid') {
      return NextResponse.json({
        status: 'paid',
        sessionId,
        receiptUrl: payment.receipt_url
      })
    }

    // If we have a Stripe session ID, verify with Stripe
    if (payment.stripe_checkout_session_id) {
      const stripeSession = await stripe.checkout.sessions.retrieve(payment.stripe_checkout_session_id)

      if (stripeSession.payment_status === 'paid') {
        // Update payment status
        await supabase
          .from('learnr_payments')
          .update({
            status: 'paid',
            receipt_url: stripeSession.receipt_email,
            paid_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('session_id', sessionId)

        return NextResponse.json({
          status: 'paid',
          sessionId,
          receiptUrl: stripeSession.receipt_email
        })
      }
    }

    return NextResponse.json({
      status: payment.status || 'not_paid',
      sessionId
    })
  } catch (error: any) {
    console.error('Verify course payment error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
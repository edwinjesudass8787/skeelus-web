import { createServerSupabaseClient } from './supabase-server'

export const COURSE_PRICE_CENTS = 2990
export const COURSE_CURRENCY = 'USD' as const

export type PaymentRow = {
  session_id: string
  status: 'unpaid' | 'pending' | 'paid' | 'failed'
  amount_cents: number
  currency: string
  receipt_url: string | null
  paid_at: string | null
  stripe_checkout_session_id: string | null
}

// Ensure payment row exists for a session
export async function ensurePaymentRow(sessionId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Check if row exists
  const { data: existing } = await supabase
    .from('learnr_payments')
    .select('session_id, status')
    .eq('user_id', user.id)
    .eq('session_id', sessionId)
    .maybeSingle()

  if (existing) return existing

  // Create new row
  const { data, error } = await supabase
    .from('learnr_payments')
    .insert({
      user_id: user.id,
      session_id: sessionId,
      status: 'unpaid',
      amount_cents: COURSE_PRICE_CENTS,
      currency: COURSE_CURRENCY
    })
    .select('session_id, status, amount_cents, currency, receipt_url, paid_at, stripe_checkout_session_id')
    .single()

  if (error) throw error
  return data as PaymentRow
}

// Get payment for session
export async function getPayment(sessionId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('learnr_payments')
    .select('session_id, status, amount_cents, currency, receipt_url, paid_at, stripe_checkout_session_id')
    .eq('user_id', user.id)
    .eq('session_id', sessionId)
    .maybeSingle()

  if (error) throw error
  return data as PaymentRow | null
}

// Get payments for multiple sessions
export async function getPaymentsForSessions(sessionIds: string[]) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  if (sessionIds.length === 0) return []

  const { data, error } = await supabase
    .from('learnr_payments')
    .select('session_id, status, amount_cents, currency, receipt_url, paid_at, stripe_checkout_session_id')
    .eq('user_id', user.id)
    .in('session_id', sessionIds)

  if (error) throw error
  return (data || []) as PaymentRow[]
}

// Create Stripe checkout session (via API route)
export async function createCheckoutSession(sessionId: string, title: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No session')

  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ sessionId, title })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Checkout session error: ${text}`)
  }

  return response.json()
}

// Verify checkout session (called after Stripe redirect)
export async function verifyCheckoutSession(checkoutSessionId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  const response = await fetch('/api/verify-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ checkoutSessionId })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Verify checkout error: ${text}`)
  }

  return response.json()
}

// Verify course payment status
export async function verifyCoursePayment(sessionId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  const response = await fetch('/api/verify-course-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ sessionId })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Verify payment error: ${text}`)
  }

  return response.json()
}

// Get list of paid receipts
export async function listReceipts() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('learnr_payments')
    .select('session_id, status, amount_cents, currency, receipt_url, paid_at')
    .eq('user_id', user.id)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })

  if (error) throw error
  return (data || []) as Pick<PaymentRow, 'session_id' | 'status' | 'amount_cents' | 'currency' | 'receipt_url' | 'paid_at'>[]
}
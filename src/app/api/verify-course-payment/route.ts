import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { checkoutSessionId } = await request.json()
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No session' }, { status: 401 })

  const response = await fetch(process.env.NEXT_PUBLIC_STRIPE_API_URL + '/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
    },
    body: JSON.stringify({ checkoutSessionId })
  })

  if (!response.ok) {
    const text = await response.text()
    return NextResponse.json({ error: text }, { status: 500 })
  }

  const result = await response.json()

  if (result.status === 'paid') {
    const { error } = await supabase
      .from('learnr_payments')
      .update({
        status: 'paid',
        receipt_url: result.receiptUrl,
        paid_at: new Date().toISOString(),
        stripe_checkout_session_id: checkoutSessionId
      })
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(result)
}
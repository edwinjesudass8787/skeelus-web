import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { COURSE_PRICE_CENTS, COURSE_CURRENCY } from '@/lib/payment-constants'

export async function POST(request: Request) {
  const { sessionId, title } = await request.json()
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'No session' }, { status: 401 })

  const response = await fetch(process.env.NEXT_PUBLIC_STRIPE_API_URL + '/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
    },
    body: JSON.stringify({
      userId: user.id,
      sessionId,
      title,
      price: COURSE_PRICE_CENTS,
      currency: COURSE_CURRENCY
    })
  })

  if (!response.ok) {
    const text = await response.text()
    return NextResponse.json({ error: text }, { status: 500 })
  }

  return NextResponse.json(await response.json())
}
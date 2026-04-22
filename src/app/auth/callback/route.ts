import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Redirect to dashboard after successful auth
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
    }
  }

  // Redirect to home on error
  return NextResponse.redirect(new URL('/?error=auth', requestUrl.origin))
}
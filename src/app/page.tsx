import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import HomeClient from './home-client'

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is logged in, they go to dashboard
  // If not, they see the landing page
  return <HomeClient user={user ? { id: user.id, email: user.email || null, fullName: user.user_metadata?.full_name as string || null } : null} />
}
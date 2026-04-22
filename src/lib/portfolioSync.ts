import { createServerSupabaseClient } from './supabase-server'
import { Portfolio } from '../types'

// Upsert portfolio to Supabase
export async function upsertRemotePortfolio(portfolio: Portfolio) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('learnr_portfolios')
    .upsert({
      user_id: user.id,
      portfolio_id: portfolio.id,
      topic: portfolio.topic,
      certificate_id: portfolio.certificateId,
      curriculum: portfolio.curriculum,
      reflections: portfolio.reflections,
      evidence: portfolio.evidence,
      completed_at: new Date(portfolio.completedAt).toISOString(),
      html: portfolio.html
    }, { onConflict: 'portfolio_id' })

  if (error) throw error
}

// Pull latest portfolio
export async function pullLatestRemotePortfolio(): Promise<Portfolio | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('learnr_portfolios')
    .select('*')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.portfolio_id,
    certificateId: data.certificate_id,
    topic: data.topic,
    curriculum: data.curriculum,
    reflections: data.reflections,
    evidence: data.evidence,
    completedAt: new Date(data.completed_at).getTime(),
    html: data.html
  }
}

// Get portfolio by certificate ID (public)
export async function getPortfolioByCertificateId(certificateId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('learnr_public_certificates')
    .select('*')
    .eq('certificate_id', certificateId)
    .maybeSingle()

  if (error) throw error
  return data
}
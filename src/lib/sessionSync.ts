import { createServerSupabaseClient } from './supabase-server'
import { SavedSession, LearningSession } from '../types'

// Push sessions to Supabase (upsert)
export async function upsertRemoteSessions(sessions: SavedSession[]) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const payload = sessions.map(s => ({
    user_id: user.id,
    session_id: s.id,
    title: s.title,
    topic: s.topic,
    curriculum: s.curriculum,
    current_stage: s.currentStage,
    stage_progress: s.stageProgress,
    started_at: new Date(s.startedAt).toISOString(),
    last_accessed_at: new Date(s.lastAccessedAt).toISOString(),
    messages: s.messages,
    video_presentation: s.videoPresentation,
    video_evaluation: s.videoEvaluation,
    video_attempts: s.videoAttempts,
    case_study_presentation: s.caseStudyPresentation,
    case_study_evaluation: s.caseStudyEvaluation,
    action_plan_draft: s.actionPlanDraft,
    payment_status: s.payment?.status
  }))

  const { error } = await supabase
    .from('learnr_sessions')
    .upsert(payload, { onConflict: 'session_id' })

  if (error) throw error
}

// Pull sessions from Supabase
export async function pullRemoteSessions(): Promise<SavedSession[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('learnr_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('last_accessed_at', { ascending: false })

  if (error) throw error

  return (data || []).map(row => ({
    id: row.session_id,
    title: row.title,
    topic: row.topic,
    curriculum: row.curriculum,
    currentStage: row.current_stage,
    stageProgress: row.stage_progress || [],
    startedAt: new Date(row.started_at).getTime(),
    lastAccessedAt: new Date(row.last_accessed_at).getTime(),
    messages: row.messages || [],
    videoPresentation: row.video_presentation,
    videoEvaluation: row.video_evaluation,
    videoAttempts: row.video_attempts,
    caseStudyPresentation: row.case_study_presentation,
    caseStudyEvaluation: row.case_study_evaluation,
    actionPlanDraft: row.action_plan_draft,
    payment: row.payment_status ? { status: row.payment_status, priceCents: 2990, currency: 'USD' as const } : undefined
  }))
}

// Delete remote session
export async function deleteRemoteSession(sessionId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('learnr_sessions')
    .delete()
    .eq('user_id', user.id)
    .eq('session_id', sessionId)
}

// Merge local and remote sessions
export function mergeSessions(local: SavedSession[], remote: SavedSession[]): SavedSession[] {
  const merged = new Map<string, SavedSession>()

  // Add all local sessions
  for (const session of local) {
    merged.set(session.id, session)
  }

  // Merge remote sessions (prefer newer lastAccessedAt)
  for (const session of remote) {
    const existing = merged.get(session.id)
    if (!existing || session.lastAccessedAt > existing.lastAccessedAt) {
      merged.set(session.id, session)
    }
  }

  // Sort by lastAccessedAt descending
  return Array.from(merged.values()).sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
}

// Convert SavedSession to LearningSession
export function toLearningSession(saved: SavedSession): LearningSession {
  return {
    id: saved.id,
    title: saved.title,
    topic: saved.topic,
    curriculum: saved.curriculum,
    messages: saved.messages || [],
    currentStage: saved.currentStage as 1 | 2 | 3 | 4 | 5,
    stageProgress: saved.stageProgress,
    startedAt: saved.startedAt,
    videoPresentation: saved.videoPresentation,
    videoEvaluation: saved.videoEvaluation,
    videoAttempts: saved.videoAttempts,
    caseStudyPresentation: saved.caseStudyPresentation,
    caseStudyEvaluation: saved.caseStudyEvaluation,
    actionPlanDraft: saved.actionPlanDraft,
    payment: saved.payment
  }
}
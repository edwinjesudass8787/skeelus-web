import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('learnr_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('last_accessed_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sessions = (data || []).map((row: any) => ({
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
    payment: row.payment_status ? { status: row.payment_status, priceCents: 2990, currency: 'USD' } : undefined
  }))

  return NextResponse.json(sessions)
}

export async function POST(request: Request) {
  const { sessions } = await request.json()
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = sessions.map((s: any) => ({
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const { sessionId } = await request.json()
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('learnr_sessions')
    .delete()
    .eq('user_id', user.id)
    .eq('session_id', sessionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
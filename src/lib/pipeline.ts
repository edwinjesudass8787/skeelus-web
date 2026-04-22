import {
  Curriculum,
  LearningSession,
  SavedSession,
  StageProgress,
  VideoPresentation,
  VideoEvaluation,
  Message,
  Concept
} from '../types'
import {
  getWebContext,
  getCaseStudies,
  getAcademicTheories,
  generateCurriculum,
  generateSessionTitle,
  generateVisual,
  classifyVisualType
} from './openrouter'

export interface PipelineState {
  stage: 'idle' | 'fetching_context' | 'fetching_theories' | 'fetching_cases' | 'curriculum' | 'visuals' | 'complete'
  progress: number
  currentConcept?: string
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create a new session
export function createSession(title: string, topic: string, curriculum: Curriculum): LearningSession {
  const now = Date.now()
  return {
    id: generateId(),
    title,
    topic,
    curriculum,
    messages: [],
    currentStage: 1,
    stageProgress: [
      { stageId: 1, status: 'not_started', correctAnswers: 0, totalQuestions: 0, quizHistory: [], startedAt: now },
      { stageId: 2, status: 'not_started', correctAnswers: 0, totalQuestions: 0, quizHistory: [], startedAt: now },
      { stageId: 3, status: 'not_started', correctAnswers: 0, totalQuestions: 0, quizHistory: [], startedAt: now },
      { stageId: 4, status: 'not_started', correctAnswers: 0, totalQuestions: 0, quizHistory: [], startedAt: now },
      { stageId: 5, status: 'not_started', correctAnswers: 0, totalQuestions: 0, quizHistory: [], startedAt: now }
    ],
    startedAt: now
  }
}

// Create saved session from learning session
export function toSavedSession(session: LearningSession): SavedSession {
  return {
    id: session.id,
    title: session.title,
    topic: session.topic,
    curriculum: session.curriculum,
    currentStage: session.currentStage,
    stageProgress: session.stageProgress,
    startedAt: session.startedAt,
    lastAccessedAt: Date.now(),
    messages: session.messages,
    videoPresentation: session.videoPresentation,
    videoEvaluation: session.videoEvaluation,
    videoAttempts: session.videoAttempts,
    caseStudyPresentation: session.caseStudyPresentation,
    caseStudyEvaluation: session.caseStudyEvaluation,
    actionPlanDraft: session.actionPlanDraft,
    payment: session.payment
  }
}

// Run the full curriculum generation pipeline
export async function runFullPipeline(
  topic: string,
  onProgress?: (state: PipelineState) => void
): Promise<{ curriculum: Curriculum }> {
  // Fetch web context
  onProgress?.({ stage: 'fetching_context', progress: 5 })
  const webContext = await getWebContext(topic)

  // Fetch academic theories
  onProgress?.({ stage: 'fetching_theories', progress: 20 })
  const theories = await getAcademicTheories(topic)

  // Fetch case studies
  onProgress?.({ stage: 'fetching_cases', progress: 35 })
  const cases = await getCaseStudies(topic)

  // Generate curriculum
  onProgress?.({ stage: 'curriculum', progress: 55 })
  const curriculumJson = await generateCurriculum(topic, webContext || undefined, theories, cases)

  let curriculum: Curriculum
  try {
    curriculum = JSON.parse(curriculumJson)
  } catch {
    throw new Error('Failed to parse curriculum')
  }

  // Ensure concepts have IDs
  curriculum.concepts = curriculum.concepts.map((c, i) => ({
    ...c,
    id: c.id || `concept-${i + 1}`
  }))

  // Generate visuals for concepts
  for (let i = 0; i < curriculum.concepts.length; i++) {
    const concept = curriculum.concepts[i]
    onProgress?.({ stage: 'visuals', progress: 70 + (i * 5), currentConcept: concept.title })

    try {
      const { visualType, spec } = await classifyVisualType(concept.title, concept.explanation)
      const visualUrl = await generateVisual(concept.title, visualType, spec)
      curriculum.concepts[i] = {
        ...concept,
        visualType: visualType as any,
        visualSpec: spec,
        visualUrl
      }
    } catch (e) {
      console.warn(`Failed to generate visual for ${concept.title}:`, e)
    }
  }

  onProgress?.({ stage: 'complete', progress: 100 })

  return { curriculum }
}

// Record an answer (for quiz progression)
export function recordAnswer(
  session: LearningSession,
  conceptId: string,
  selectedAnswer: number,
  isCorrect: boolean
): LearningSession {
  const updated = { ...session }
  const stageProgress = [...updated.stageProgress]
  const currentProgress = stageProgress[0]

  stageProgress[0] = {
    ...currentProgress,
    correctAnswers: currentProgress.correctAnswers + (isCorrect ? 1 : 0),
    totalQuestions: currentProgress.totalQuestions + 1,
    quizHistory: [
      ...currentProgress.quizHistory,
      { questionId: conceptId, selectedAnswer, isCorrect, timestamp: Date.now() }
    ]
  }

  updated.stageProgress = stageProgress
  return updated
}

// Advance to next stage
export function advanceStage(session: LearningSession): LearningSession {
  const updated = { ...session }
  const stageProgress = [...updated.stageProgress]
  const currentIdx = updated.currentStage - 1

  // Mark current stage as completed
  if (currentIdx >= 0 && currentIdx < stageProgress.length) {
    stageProgress[currentIdx] = {
      ...stageProgress[currentIdx],
      status: 'completed' as const,
      completedAt: Date.now()
    }
  }

  // Advance currentStage
  const nextStage = Math.min(updated.currentStage + 1, 5) as 1 | 2 | 3 | 4 | 5
  updated.currentStage = nextStage

  // Mark next stage as in_progress if not already
  if (nextStage - 1 < stageProgress.length) {
    stageProgress[nextStage - 1] = {
      ...stageProgress[nextStage - 1],
      status: 'in_progress' as const,
      startedAt: Date.now()
    }
  }

  updated.stageProgress = stageProgress
  return updated
}

// Fix session progress (for resuming old sessions)
export function fixSessionProgress(session: LearningSession): LearningSession {
  const updated = { ...session }
  let maxCompletedStage = 0

  // Find the highest completed stage
  for (const sp of updated.stageProgress) {
    if (sp.status === 'completed') {
      maxCompletedStage = Math.max(maxCompletedStage, sp.stageId)
    }
  }

  // If currentStage is ahead of any completed stage, reset to last completed + 1
  if (updated.currentStage > maxCompletedStage + 1) {
    updated.currentStage = (maxCompletedStage + 1) as 1 | 2 | 3 | 4 | 5
  }

  return updated
}

// Save chat message to session
export function addMessage(session: LearningSession, message: Message): LearningSession {
  return {
    ...session,
    messages: [...session.messages, message]
  }
}

// Generate portfolio from completed session
export function createPortfolio(session: LearningSession, reflections: string): {
  id: string
  certificateId: string
  topic: string
  curriculum: Curriculum
  reflections: string
  completedAt: number
  html: string
} {
  const certificateId = `LRN-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

  return {
    id: generateId(),
    certificateId,
    topic: session.topic,
    curriculum: session.curriculum,
    reflections,
    completedAt: Date.now(),
    html: '' // Will be generated by the component
  }
}

// Load chat messages (client-side localStorage)
export function loadChatMessages(sessionId: string): Message[] {
  if (typeof window === 'undefined') return []
  const key = `chat-messages-${sessionId}`
  const saved = localStorage.getItem(key)
  if (!saved) return []
  try {
    return JSON.parse(saved)
  } catch {
    return []
  }
}

// Save chat messages (client-side localStorage)
export function saveChatMessages(sessionId: string, messages: Message[]): void {
  if (typeof window === 'undefined') return
  const key = `chat-messages-${sessionId}`
  localStorage.setItem(key, JSON.stringify(messages))
}
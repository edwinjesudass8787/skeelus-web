// Types for Skeelus Web - Replicated from Electron app

export interface Concept {
  id: string
  title: string
  explanation: string
  visualType?: 'flowchart' | 'concept_map' | 'bar_chart' | 'radar_chart' | 'timeline' | 'comparison_table' | 'process_diagram'
  visualSpec?: string
  visualUrl?: string
  visualCode?: string
}

export interface AcademicTheory {
  name: string
  author?: string
  year?: number
  description: string
  relevance: string
}

export interface CaseStudy {
  title: string
  organization?: string
  year: number
  summary: string
  keyTakeaways: string[]
  source?: string
}

export interface Curriculum {
  topic: string
  refinedTopic?: string
  whyItMatters: string
  bigPicture: string
  concepts: Concept[]
  commonMisconceptions: string[]
  quizQuestions?: QuizQuestion[]
  academicTheories: AcademicTheory[]
  caseStudies: CaseStudy[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface QuizQuestion {
  id: string
  conceptId: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface QuizAnswer {
  questionId: string
  selectedAnswer: number
  isCorrect: boolean
  timestamp: number
}

export interface StageProgress {
  stageId: number
  status: 'not_started' | 'in_progress' | 'completed'
  correctAnswers: number
  totalQuestions: number
  quizHistory: QuizAnswer[]
  startedAt?: number
  completedAt?: number
}

export interface VideoPresentation {
  videoUrl: string
  transcript: string
  duration: number
  recordedAt: number
}

export interface VideoEvaluation {
  canProceed: boolean
  feedback: string
  overallScore: number
  conceptsCovered: string[]
  conceptsMissing: string[]
  conceptsPartial: string[]
  overallReadiness: 'ready' | 'needs_more_practice'
}

export interface VideoAttempt {
  id: string
  presentation: VideoPresentation
  evaluation?: VideoEvaluation
}

export type CoursePaymentStatus = 'unpaid' | 'pending' | 'paid'

export interface CoursePayment {
  status: CoursePaymentStatus
  priceCents: number
  currency: 'USD'
  paidAt?: number
  receiptUrl?: string
}

export interface LearningSession {
  id: string
  title: string
  topic: string
  curriculum: Curriculum
  messages: Message[]
  currentStage: 1 | 2 | 3 | 4 | 5
  stageProgress: StageProgress[]
  startedAt: number
  completedAt?: number
  videoPresentation?: VideoPresentation
  videoEvaluation?: VideoEvaluation
  videoAttempts?: VideoAttempt[]
  caseStudyPresentation?: VideoPresentation
  caseStudyEvaluation?: VideoEvaluation
  actionPlanDraft?: Record<string, string | number> | null
  payment?: CoursePayment
}

export interface Portfolio {
  id: string
  certificateId: string
  topic: string
  curriculum: Curriculum
  reflections: string
  completedAt: number
  html: string
}

export interface SavedSession {
  id: string
  title: string
  topic: string
  curriculum: Curriculum
  currentStage: number
  stageProgress: StageProgress[]
  startedAt: number
  lastAccessedAt: number
  messages: Message[]
  videoPresentation?: VideoPresentation
  videoEvaluation?: VideoEvaluation
  videoAttempts?: VideoAttempt[]
  caseStudyPresentation?: VideoPresentation
  caseStudyEvaluation?: VideoEvaluation
  actionPlanDraft?: Record<string, string | number> | null
  payment?: CoursePayment
}

export interface User {
  id: string
  email?: string | null
  fullName?: string | null
}

export const STAGES = [
  { id: 1, name: 'Orient', description: 'Why it matters and where it fits', milestone: 3 },
  { id: 2, name: 'Understand', description: 'What you actually need to know', milestone: 4 },
  { id: 3, name: 'Practise', description: 'Apply in a safe environment', milestone: 3 },
  { id: 4, name: 'Prove', description: 'Demonstrate real-world skill', milestone: 1 },
  { id: 5, name: 'Articulate', description: 'Reflect and articulate your learning', milestone: 1 }
] as const

export const MODELS = {
  sonar: 'perplexity/sonar',
  gpt4oMini: 'openai/gpt-4.1-nano',
  gptAudioMini: 'openai/gpt-audio-mini',
  seedream: 'bytedance-seed/seedream-4.5',
  geminiFlash: 'google/gemini-2.0-flash-001'
} as const

export const STAGE_MILESTONES = {
  1: { correct: 3, total: 5 },
  2: { correct: 4, total: 6 },
  3: { correct: 3, total: 4 },
  4: { correct: 1, total: 1 },
  5: { correct: 1, total: 1 }
} as const

export const COURSE_PRICE_CENTS = 2990
export const COURSE_CURRENCY = 'USD' as const

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenRouterRequest {
  model: string
  messages: OpenRouterMessage[]
  temperature?: number
  max_tokens?: number
}

export interface OpenRouterResponse {
  id: string
  model: string
  created: number
  choices: {
    index: number
    message: OpenRouterMessage
    finish_reason: string
  }[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
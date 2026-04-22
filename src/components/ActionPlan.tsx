'use client'

import { useState, useEffect } from 'react'
import { Target, Clock, Calendar, TrendingUp, Loader2, CheckCircle } from 'lucide-react'
import { Concept } from '@/types'
import { generateCustomActionPlanFields, evaluateActionPlanSection } from '@/lib/openrouter'

const ICONS: Record<string, any> = {
  Target,
  Clock,
  Calendar,
  TrendingUp,
  BookOpen: Target,
  Lightbulb: Target,
  Zap: Target,
  Star: Target,
  CheckCircle: CheckCircle,
  FileText: Target,
  Users: Target,
  AlertTriangle: Target
}

const COLORS: Record<string, string> = {
  violet: 'bg-violet-50 border-violet-200',
  blue: 'bg-blue-50 border-blue-200',
  emerald: 'bg-emerald-50 border-emerald-200',
  amber: 'bg-amber-50 border-amber-200',
  cyan: 'bg-cyan-50 border-cyan-200',
  rose: 'bg-rose-50 border-rose-200',
  green: 'bg-green-50 border-green-200',
  indigo: 'bg-indigo-50 border-indigo-200',
  purple: 'bg-purple-50 border-purple-200',
  orange: 'bg-orange-50 border-orange-200',
  pink: 'bg-pink-50 border-pink-200',
  teal: 'bg-teal-50 border-teal-200'
}

const TEXT_COLORS: Record<string, string> = {
  violet: 'text-violet-700',
  blue: 'text-blue-700',
  emerald: 'text-emerald-700',
  amber: 'text-amber-700',
  cyan: 'text-cyan-700',
  rose: 'text-rose-700',
  green: 'text-green-700',
  indigo: 'text-indigo-700',
  purple: 'text-purple-700',
  orange: 'text-orange-700',
  pink: 'text-pink-700',
  teal: 'text-teal-700'
}

interface Field {
  id: string
  title: string
  subtitle: string
  icon: string
  color: string
  placeholder: string
}

interface Props {
  sessionId: string
  topic: string
  concepts: Concept[]
  onComplete: () => void
}

export default function ActionPlan({ sessionId, topic, concepts, onComplete }: Props) {
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [evaluating, setEvaluating] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, { score: number; feedback: string }>>({})
  const [allGood, setAllGood] = useState(false)

  useEffect(() => {
    loadFields()
  }, [topic, concepts])

  const loadFields = async () => {
    setLoading(true)
    try {
      const result = await generateCustomActionPlanFields(topic, concepts)
      setFields(result.fields)
    } catch (e) {
      console.error('Failed to generate fields:', e)
      // Fallback fields
      setFields([
        { id: 'goals', title: 'Goals & Objectives', subtitle: 'What do you want to achieve?', icon: 'Target', color: 'violet', placeholder: 'What specific goals do you want to accomplish?' },
        { id: 'dailyPractices', title: 'Daily Practices', subtitle: 'What will you do each day?', icon: 'Clock', color: 'blue', placeholder: 'What small actions will you take daily?' },
        { id: 'weeklyActions', title: 'Weekly Actions', subtitle: 'What bigger steps this week?', icon: 'Calendar', color: 'emerald', placeholder: 'What meaningful actions will you take this week?' },
        { id: 'milestones', title: 'Monthly Milestones', subtitle: 'What will you have accomplished?', icon: 'TrendingUp', color: 'amber', placeholder: 'What significant achievements will mark your progress?' }
      ])
    }
    setLoading(false)
  }

  const handleAnswerChange = (fieldId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }))
  }

  const evaluateField = async (field: Field) => {
    const answer = answers[field.id]
    if (!answer?.trim()) return

    setEvaluating(field.id)
    try {
      const result = await evaluateActionPlanSection(field.title, field.subtitle, answer, topic)
      setFeedback(prev => ({ ...prev, [field.id]: { score: result.score, feedback: result.feedback } }))

      if (result.score >= 7) {
        // Check if all fields are good
        const allAnswered = fields.every(f => f.id === field.id || answers[f.id]?.trim())
        const allEvaluatedGood = fields.every(f => f.id === field.id || feedback[f.id]?.score >= 7)
        if (allAnswered && allEvaluatedGood) {
          setAllGood(true)
        }
      }
    } catch (e) {
      console.error('Evaluation failed:', e)
    }
    setEvaluating(null)
  }

  const handleComplete = () => {
    // Save answers to localStorage
    localStorage.setItem(`action-plan-${sessionId}`, JSON.stringify(answers))
    onComplete()
  }

  if (loading) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-brand-500' />
      </div>
    )
  }

  return (
    <div className='flex-1 overflow-y-auto'>
      <div className='max-w-3xl mx-auto px-6 py-8'>
        {/* Header */}
        <div className='bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white mb-8'>
          <h2 className='text-2xl font-bold mb-2'>Create Your Action Plan</h2>
          <p className='text-white/90'>
            Turn your learning into action. These customized sections are tailored to {topic}.
          </p>
        </div>

        {/* Fields */}
        <div className='space-y-6'>
          {fields.map((field) => {
            const IconComponent = ICONS[field.icon] || Target
            const colorClass = COLORS[field.color] || COLORS.violet
            const textClass = TEXT_COLORS[field.color] || TEXT_COLORS.violet
            const fieldFeedback = feedback[field.id]
            const isEvaluating = evaluating === field.id

            return (
              <div key={field.id} className={`rounded-2xl border p-6 ${colorClass}`}>
                <div className='flex items-center gap-3 mb-3'>
                  <IconComponent className={`w-5 h-5 ${textClass}`} />
                  <div>
                    <h3 className={`font-semibold ${textClass}`}>{field.title}</h3>
                    <p className='text-sm opacity-70'>{field.subtitle}</p>
                  </div>
                </div>

                <textarea
                  value={answers[field.id] || ''}
                  onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  className='w-full px-4 py-3 rounded-xl border border-white/50 bg-white/80 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all resize-none'
                />

                <div className='flex items-center justify-between mt-3'>
                  {fieldFeedback ? (
                    <div className='flex items-center gap-2'>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${fieldFeedback.score >= 7 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        Score: {fieldFeedback.score}/10
                      </span>
                      <span className='text-sm text-gray-600'>{fieldFeedback.feedback}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => evaluateField(field)}
                      disabled={!answers[field.id]?.trim() || isEvaluating}
                      className='px-4 py-2 bg-white/80 hover:bg-white text-gray-700 font-medium text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2'
                    >
                      {isEvaluating && <Loader2 className='w-4 h-4 animate-spin' />}
                      Get Feedback
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Complete Button */}
        <button
          onClick={handleComplete}
          className='w-full mt-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2'
        >
          <CheckCircle className='w-5 h-5' />
          Complete Action Plan
        </button>
      </div>
    </div>
  )
}
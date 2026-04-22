'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { CoursePayment } from '@/types'
import { runFullPipeline, createSession } from '@/lib/pipeline'
import { generateSessionTitle } from '@/lib/openrouter'
import { PipelineState } from '@/lib/pipeline'

const PROMPT_CHIPS = [
  'My 1-on-1s feel unfocused and my reports leave without clarity.',
  'My team moves slowly and I do not know how to improve velocity.',
  'I avoid giving feedback because I worry I will demotivate people.',
  'Retrospectives turn into complaints and nothing changes.',
  'I need to write stronger performance reviews.'
]

export default function NewSessionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<PipelineState | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (topic?: string) => {
    const topicToUse = topic || input
    if (!topicToUse.trim()) return

    setLoading(true)
    setError('')
    setProgress({ stage: 'idle', progress: 0 })

    try {
      // Run full curriculum pipeline
      setProgress({ stage: 'fetching_context', progress: 5 })

      const { curriculum } = await runFullPipeline(topicToUse, (state) => {
        setProgress(state)
      })

      // Generate session title
      setProgress({ stage: 'curriculum', progress: 55, currentConcept: 'Generating title...' })
      const sessionTitle = await generateSessionTitle(topicToUse, curriculum)

      // Create session
      const session = createSession(sessionTitle, topicToUse, curriculum)

      // Ensure payment row exists
      await fetch('/api/ensure-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id })
      })

      // Store in sessionStorage and navigate
      sessionStorage.setItem('current-session', JSON.stringify(session))
      router.push(`/session/${session.id}`)
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getProgressMessage = (): { text: string; icon: string } => {
    if (!progress) return { text: '', icon: '' }
    switch (progress.stage) {
      case 'fetching_context':
        return { text: 'Fetching latest info on this topic...', icon: '🌐' }
      case 'fetching_theories':
        return { text: 'Researching academic foundations...', icon: '📖' }
      case 'fetching_cases':
        return { text: 'Finding real-world case studies...', icon: '🎯' }
      case 'curriculum':
        return { text: 'Building your personalized curriculum...', icon: '📚' }
      case 'visuals':
        return { text: `Creating visual for ${progress.currentConcept || 'concepts'}...`, icon: '🎨' }
      case 'complete':
        return { text: 'Ready!', icon: '✅' }
      default:
        return { text: 'Preparing...', icon: '⏳' }
    }
  }

  const progressInfo = getProgressMessage()
  const progressPercent = progress?.progress || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg">
              S
            </div>
            <span className="brand-wordmark text-xl font-bold text-gray-900">Skeelus</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-12 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          What problem are you trying to solve at work?
        </h1>
        <p className="text-gray-500 mb-8">
          Describe your situation and we&apos;ll build a personalized course for you.
        </p>

        {/* Input */}
        <div className="relative mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. My team avoids hard feedback and I need a better way to coach performance..."
            className="w-full px-6 py-4 pr-32 rounded-2xl border-2 border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all text-lg"
            disabled={loading}
            autoFocus
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                Start
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Progress */}
        {loading && progress && progress.stage !== 'idle' && (
          <div className="mb-6 animate-fade-in">
            {/* Pipeline stages */}
            <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
              {['🌐', '📖', '🎯', '📚', '🎨'].map((emoji, i) => {
                const thresholds = [5, 20, 35, 50, 70]
                const isActive = progressPercent >= thresholds[i]
                return (
                  <div key={i} className={`flex items-center gap-1 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                    <span>{emoji}</span>
                    {i < 4 && <span className="text-gray-300">→</span>}
                  </div>
                )
              })}
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden max-w-md mx-auto">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Status message */}
            <p className="text-sm text-gray-500 mt-3">{progressInfo.text}</p>
          </div>
        )}

        {/* Prompt chips */}
        {!loading && (
          <div className="mb-8">
            <p className="text-sm text-gray-400 mb-3">Or start from a real work problem:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSubmit(chip)}
                  className="px-4 py-2 bg-white border border-gray-200 hover:border-brand-300 hover:text-brand-600 rounded-full text-sm text-gray-600 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Example prompt */}
        <div className="mt-8 rounded-2xl border border-brand-100 bg-brand-50/60 p-5 text-left">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-700 mb-2">Example prompt</div>
          <p className="text-sm leading-6 text-brand-900">
            &quot;I just became a first-time manager and I struggle to run effective 1-on-1s. I want to learn how to set expectations, give useful feedback, and build trust with my team.&quot;
          </p>
        </div>
      </main>
    </div>
  )
}

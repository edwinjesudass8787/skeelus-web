'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LearningSession, STAGES, STAGE_MILESTONES } from '@/types'
import { createClient } from '@/lib/supabase'
import { COURSE_PRICE_CENTS, COURSE_CURRENCY } from '@/lib/payment-constants'
import ChatTutor from '@/components/ChatTutor'
import VideoPresentation from '@/components/VideoPresentation'
import CaseStudyPractice from '@/components/CaseStudyPractice'
import ActionPlan from '@/components/ActionPlan'
import PortfolioScreen from '@/components/PortfolioScreen'

const STORAGE_KEY = 'skeelus-web-state'

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [session, setSession] = useState<LearningSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'current' | 'reference'>('current')
  const [chatCompleted, setChatCompleted] = useState(false)
  const [videoCompleted, setVideoCompleted] = useState(false)
  const [caseStudyCompleted, setCaseStudyCompleted] = useState(false)
  const [actionPlanCompleted, setActionPlanCompleted] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [portfolio, setPortfolio] = useState<any>(null)

  // Load session from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('current-session')
    if (stored) {
      try {
        setSession(JSON.parse(stored))
      } catch {}
    }
    setLoading(false)
  }, [])

  // Check payment status on mount
  useEffect(() => {
    if (!session) return

    const paymentParam = searchParams.get('payment')
    if (paymentParam === 'success') {
      const urlParams = new URLSearchParams(window.location.search)
      const checkoutSessionId = urlParams.get('session_id')
      if (checkoutSessionId) {
        fetch('/api/verify-course-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkoutSessionId })
        })
          .then(res => res.json())
          .then(result => {
            if (result.status === 'paid') {
              setSession(prev => prev ? {
                ...prev,
                payment: { status: 'paid', priceCents: COURSE_PRICE_CENTS, currency: COURSE_CURRENCY, paidAt: Date.now(), receiptUrl: result.receiptUrl }
              } : null)
              updateLocalStorage({ ...session, payment: { status: 'paid', priceCents: COURSE_PRICE_CENTS, currency: COURSE_CURRENCY, paidAt: Date.now(), receiptUrl: result.receiptUrl } })
            }
          })
          .catch(console.error)
      }
    }
  }, [searchParams, session])

  // Update localStorage and sync
  const updateLocalStorage = (updatedSession: LearningSession) => {
    const saved = localStorage.getItem(STORAGE_KEY)
    let sessions: any[] = []
    if (saved) {
      try {
        sessions = JSON.parse(saved).sessions || []
      } catch {}
    }

    const idx = sessions.findIndex((s: any) => s.id === updatedSession.id)
    if (idx >= 0) {
      sessions[idx] = {
        ...sessions[idx],
        ...updatedSession,
        lastAccessedAt: Date.now()
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions }))
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions })
    }).catch(console.warn)
  }

  // Handle session update
  const handleSessionUpdate = (updatedSession: LearningSession) => {
    setSession(updatedSession)
    updateLocalStorage(updatedSession)
  }

  // Handle milestone reached (Stage 1 chat complete)
  const handleMilestoneReached = (demonstratedConcepts: string[], milestoneResult: any) => {
    setChatCompleted(true)
    const updatedSession = {
      ...session!,
      currentStage: 2 as const,
      stageProgress: session!.stageProgress.map((sp, i) =>
        i === 0 ? { ...sp, status: 'completed' as const, completedAt: Date.now() } :
        i === 1 ? { ...sp, status: 'in_progress' as const, startedAt: Date.now() } : sp
      )
    }
    handleSessionUpdate(updatedSession)
  }

  // Handle video complete (Stage 2)
  const handleVideoComplete = (video: any, evaluation: any) => {
    setVideoCompleted(true)
    const updatedSession = {
      ...session!,
      currentStage: 3 as const,
      videoPresentation: video,
      videoEvaluation: evaluation,
      stageProgress: session!.stageProgress.map((sp, i) =>
        i === 1 ? { ...sp, status: 'completed' as const, completedAt: Date.now() } :
        i === 2 ? { ...sp, status: 'in_progress' as const, startedAt: Date.now() } : sp
      )
    }
    handleSessionUpdate(updatedSession)
  }

  // Handle case study complete (Stage 3)
  const handleCaseStudyComplete = (video: any, evaluation: any) => {
    setCaseStudyCompleted(true)
    const updatedSession = {
      ...session!,
      currentStage: 4 as const,
      caseStudyPresentation: video,
      caseStudyEvaluation: evaluation,
      stageProgress: session!.stageProgress.map((sp, i) =>
        i === 2 ? { ...sp, status: 'completed' as const, completedAt: Date.now() } :
        i === 3 ? { ...sp, status: 'in_progress' as const, startedAt: Date.now() } : sp
      )
    }
    handleSessionUpdate(updatedSession)
  }

  // Handle action plan complete (Stage 4)
  const handleActionPlanComplete = () => {
    setActionPlanCompleted(true)
    const updatedSession = {
      ...session!,
      currentStage: 5 as const,
      stageProgress: session!.stageProgress.map((sp, i) =>
        i === 3 ? { ...sp, status: 'completed' as const, completedAt: Date.now() } :
        i === 4 ? { ...sp, status: 'in_progress' as const, startedAt: Date.now() } : sp
      )
    }
    handleSessionUpdate(updatedSession)
  }

  // Handle portfolio complete
  const handlePortfolioComplete = (portfolioData: any) => {
    setPortfolio(portfolioData)
  }

  // Handle payment
  const handlePayment = async () => {
    if (!session) return
    setPaymentLoading(true)

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, title: session.title })
      })
      const { url } = await response.json()
      window.location.href = url
    } catch (e: any) {
      console.error('Payment error:', e)
      alert('Failed to create payment session. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  // Handle stage completion and move to next
  const handleAdvanceStage = () => {
    if (!session) return
    const nextStage = Math.min(session.currentStage + 1, 5)
    const updatedSession = {
      ...session,
      currentStage: nextStage as 1 | 2 | 3 | 4 | 5
    }
    handleSessionUpdate(updatedSession)
  }

  // Check if user needs to pay
  const needsPayment = session && session.payment?.status !== 'paid' && session.currentStage > 1

  if (loading) {
    return (
      <div className min-h-screen flex items-center justify-center>
        <div className animate-pulse text-brand-600 text-lg>Loading session...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className min-h-screen flex items-center justify-center flex-col gap-4>
        <p className text-gray-500>Session not found</p>
        <Link href='/dashboard' className='px-4 py-2 bg-brand-600 text-white rounded-xl'>
          Go to Dashboard
        </Link>
      </div>
    )
  }

  // Show portfolio if completed
  if (portfolio) {
    return <PortfolioScreen portfolio={portfolio} onRestart={() => router.push('/dashboard')} />
  }

  // Show payment modal if needed
  if (showPaymentModal || needsPayment) {
    return (
      <div className='min-h-screen flex items-center justify-center px-6'>
        <div className='bg-white rounded-2xl border border-gray-200 shadow-lg p-8 max-w-md w-full text-center'>
          <div className='text-5xl mb-4'>💳</div>
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>Unlock Full Access</h2>
          <p className='text-gray-500 mb-6'>
            Pay once to access all learning stages and receive your certificate.
          </p>
          <div className='bg-gray-50 rounded-xl p-4 mb-6'>
            <span className='text-3xl font-bold text-gray-900'>$29.90</span>
            <span className='text-gray-500 text-sm ml-2'>one-time payment</span>
          </div>
          <button
            onClick={handlePayment}
            disabled={paymentLoading}
            className='w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2'
          >
            {paymentLoading ? (
              <>
                <svg className='animate-spin w-5 h-5' viewBox='0 0 24 24'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
                </svg>
                Redirecting to payment...
              </>
            ) : (
              'Pay with Stripe'
            )}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className='mt-4 text-gray-500 hover:text-gray-700 text-sm'
          >
            Cancel and go back
          </button>
        </div>
      </div>
    )
  }

  const currentStage = session.currentStage
  const stageName = STAGES.find(s => s.id === currentStage)?.name || 'Learning'

  return (
    <div className='min-h-screen flex flex-col bg-white'>
      {/* Header */}
      <header className='border-b border-gray-100 px-6 py-4 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Link href='/dashboard' className='p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors'>
            <svg className='w-5 h-5 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
            </svg>
          </Link>
          <div className='w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg'>
            S
          </div>
          <div>
            <h1 className='text-sm font-semibold text-gray-900'>{session.title}</h1>
            <p className='text-xs text-gray-400'>Stage {currentStage} — {stageName}</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className='flex items-center gap-2'>
          <button
            onClick={() => setViewMode('current')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'current'
                ? 'bg-brand-100 text-brand-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {currentStage === 1 ? '💬' : '📹'} {stageName}
          </button>
          <button
            onClick={() => setViewMode('reference')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'reference'
                ? 'bg-brand-100 text-brand-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📖 Reference
          </button>
        </div>
      </header>

      {/* Milestone Banner */}
      <div className='bg-gradient-to-r from-brand-50 to-indigo-50 px-6 py-3 border-b border-brand-100'>
        <div className='max-w-2xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-2 text-sm'>
            <span className='text-gray-600'>Your Goal:</span>
            <span className='font-medium text-gray-900'>
              {currentStage === 1 && 'Have a conversation with your tutor — answer questions in your own words'}
              {currentStage === 2 && 'Record a video explaining what you learned'}
              {currentStage === 3 && 'Complete a case study practice scenario'}
              {currentStage === 4 && 'Create your action plan for applying what you learned'}
              {currentStage === 5 && 'Reflect on your learning journey'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'current' && currentStage === 1 && !chatCompleted && (
        <div className='flex-1 flex flex-col overflow-hidden'>
          <ChatTutor
            sessionId={session.id}
            topic={session.title}
            concepts={session.curriculum.concepts}
            requiredCorrect={STAGE_MILESTONES[1].correct}
            onMilestoneReached={handleMilestoneReached}
          />
        </div>
      )}

      {viewMode === 'current' && currentStage === 2 && !videoCompleted && (
        <div className='flex-1 flex flex-col overflow-hidden'>
          <VideoPresentation
            sessionId={session.id}
            topic={session.topic}
            concepts={session.curriculum.concepts}
            onComplete={handleVideoComplete}
            existingVideo={session.videoPresentation}
            existingAttempts={session.videoAttempts}
          />
        </div>
      )}

      {viewMode === 'current' && currentStage === 3 && !caseStudyCompleted && (
        <div className='flex-1 flex flex-col overflow-hidden'>
          <CaseStudyPractice
            sessionId={session.id}
            topic={session.topic}
            concepts={session.curriculum.concepts}
            onComplete={handleCaseStudyComplete}
          />
        </div>
      )}

      {viewMode === 'current' && currentStage === 4 && !actionPlanCompleted && (
        <div className='flex-1 flex flex-col overflow-hidden'>
          <ActionPlan
            sessionId={session.id}
            topic={session.topic}
            concepts={session.curriculum.concepts}
            onComplete={handleActionPlanComplete}
          />
        </div>
      )}

      {viewMode === 'current' && (chatCompleted || videoCompleted || caseStudyCompleted || actionPlanCompleted) && (
        <div className='flex-1 overflow-y-auto'>
          <div className='max-w-3xl mx-auto px-6 py-8'>
            <div className='text-center py-8'>
              <div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white mb-6 shadow-lg'>
                <svg className='w-10 h-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                </svg>
              </div>
              <h2 className='text-3xl font-bold text-gray-900 mb-2'>Stage Complete!</h2>
              <p className='text-gray-600 mb-6'>
                {currentStage < 5 ? `You've completed Stage ${currentStage}. Ready for the next challenge?` : 'Congratulations on completing your learning journey!'}
              </p>

              <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
                {currentStage < 5 ? (
                  <button
                    onClick={handleAdvanceStage}
                    className='px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2'
                  >
                    Continue to Stage {currentStage + 1}
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 7l5 5m0 0l-5 5m5-5H6' />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // Generate portfolio
                      const portfolioData = {
                        id: `portfolio-${Date.now()}`,
                        certificateId: `LRN-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
                        topic: session.topic,
                        curriculum: session.curriculum,
                        reflections: 'Learning journey completed successfully.',
                        completedAt: Date.now(),
                        html: ''
                      }
                      setPortfolio(portfolioData)
                    }}
                    className='px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2'
                  >
                    🏆 View My Certificate
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reference View */}
      {viewMode === 'reference' && (
        <main className='flex-1 overflow-y-auto bg-gray-50'>
          <div className='max-w-4xl mx-auto px-6 py-10'>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>{session.title}</h2>
            <p className='text-gray-500 mb-8'>{session.topic}</p>

            {/* Why It Matters */}
            <section className='mb-10'>
              <h3 className='text-lg font-semibold text-gray-900 mb-3'>🎯 Why It Matters</h3>
              <p className='text-gray-700 leading-relaxed'>{session.curriculum.whyItMatters}</p>
            </section>

            {/* Big Picture */}
            <section className='mb-10'>
              <h3 className='text-lg font-semibold text-gray-900 mb-3'>🌍 The Big Picture</h3>
              <p className='text-gray-700 leading-relaxed'>{session.curriculum.bigPicture}</p>
            </section>

            {/* Core Concepts */}
            <section className='mb-10'>
              <h3 className='text-lg font-semibold text-gray-900 mb-3'>💡 Core Concepts</h3>
              <div className='space-y-4'>
                {session.curriculum.concepts.map((concept, index) => (
                  <div key={concept.id} className='bg-white rounded-xl border border-gray-200 p-5'>
                    <div className='flex items-start gap-4'>
                      <div className='w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm'>
                        {index + 1}
                      </div>
                      <div>
                        <h4 className='font-semibold text-gray-900 mb-1'>{concept.title}</h4>
                        <p className='text-gray-600 text-sm'>{concept.explanation}</p>
                        {concept.visualUrl && (
                          <img src={concept.visualUrl} alt={concept.title} className='mt-3 max-w-md rounded-lg' />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Academic Theories */}
            {session.curriculum.academicTheories?.length > 0 && (
              <section className='mb-10'>
                <h3 className='text-lg font-semibold text-gray-900 mb-3'>📚 Academic Foundations</h3>
                <div className='space-y-4'>
                  {session.curriculum.academicTheories.map((theory, index) => (
                    <div key={index} className='bg-purple-50 rounded-xl p-5 border border-purple-100'>
                      <span className='text-xs font-semibold text-purple-700 uppercase tracking-wide'>{theory.name}</span>
                      {theory.author && <span className='text-xs text-purple-600 ml-2'>{theory.author}, {theory.year}</span>}
                      <p className='text-gray-700 text-sm mt-2'>{theory.description}</p>
                      <p className='text-purple-800 text-sm mt-2'><strong>Relevance:</strong> {theory.relevance}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Case Studies */}
            {session.curriculum.caseStudies?.length > 0 && (
              <section className='mb-10'>
                <h3 className='text-lg font-semibold text-gray-900 mb-3'>🏢 Case Studies</h3>
                <div className='space-y-4'>
                  {session.curriculum.caseStudies.map((caseStudy, index) => (
                    <div key={index} className='bg-green-50 rounded-xl p-5 border border-green-100'>
                      <h4 className='font-semibold text-gray-900'>{caseStudy.title}</h4>
                      <p className='text-xs text-gray-500 mb-2'>{caseStudy.organization} • {caseStudy.year}</p>
                      <p className='text-gray-700 text-sm'>{caseStudy.summary}</p>
                      <ul className='mt-3 text-sm text-green-800 list-disc list-inside'>
                        {caseStudy.keyTakeaways.map((takeaway, i) => (
                          <li key={i}>{takeaway}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
      )}
    </div>
  )
}
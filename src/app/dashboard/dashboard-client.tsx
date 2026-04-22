'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { SavedSession, STAGES, LearningSession } from '@/types'

interface Props {
  user: { id: string; email?: string | null; fullName?: string | null }
}

const STORAGE_KEY = 'skeelus-web-state'

function mergeSessions(local: SavedSession[], remote: SavedSession[]): SavedSession[] {
  const merged = new Map<string, SavedSession>()
  for (const session of local) merged.set(session.id, session)
  for (const session of remote) {
    const existing = merged.get(session.id)
    if (!existing || session.lastAccessedAt > existing.lastAccessedAt) {
      merged.set(session.id, session)
    }
  }
  return Array.from(merged.values()).sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
}

function toLearningSession(saved: SavedSession): LearningSession {
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

export default function DashboardClient({ user }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [loading, setLoading] = useState(true)
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'error'>('idle')

  useEffect(() => {
    const loadSessions = async () => {
      const saved = localStorage.getItem(STORAGE_KEY)
      let localSessions: SavedSession[] = []
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          localSessions = parsed.sessions || []
        } catch {}
      }

      setSessions(localSessions)
      setLoading(false)

      try {
        const res = await fetch('/api/sessions')
        if (res.ok) {
          const remote: SavedSession[] = await res.json()
          const merged = mergeSessions(localSessions, remote)
          setSessions(merged)
        }
      } catch (e) {
        console.warn('Failed to pull remote sessions:', e)
        setSyncState('error')
      }
    }

    loadSessions()
  }, [])

  useEffect(() => {
    if (!user.id) return

    const timer = setTimeout(() => {
      setSyncState('syncing')
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions })
      })
        .then(() => setSyncState('idle'))
        .catch(() => setSyncState('error'))
    }, 1500)

    return () => clearTimeout(timer)
  }, [sessions, user.id])

  useEffect(() => {
    if (loading) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions }))
  }, [sessions, loading])

  const handleResumeSession = (session: SavedSession) => {
    const learningSession = toLearningSession(session)
    sessionStorage.setItem('current-session', JSON.stringify(learningSession))
    router.push(`/session/${session.id}`)
  }

  const handleDeleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    fetch('/api/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    }).catch(() => {})
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getSessionStageName = (stageId: number): string => {
    return STAGES.find(s => s.id === stageId)?.name || 'Unknown'
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg">
              S
            </div>
            <span className="brand-wordmark text-xl font-bold text-gray-900">Skeelus</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {syncState === 'syncing' && (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Syncing...
                </span>
              )}
              {syncState === 'idle' && user.fullName && (
                <span>Welcome, {user.fullName}</span>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Sessions</h1>
            <p className="text-gray-500">Continue where you left off or start a new learning journey</p>
          </div>
          <Link
            href="/dashboard/new"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Session
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-brand-600 text-lg">Loading sessions...</div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No sessions yet</h2>
            <p className="text-gray-500 mb-6">Start your first learning session to begin your journey</p>
            <Link
              href="/dashboard/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors"
            >
              Start Learning
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleResumeSession(session)}
                className="w-full p-5 bg-white border border-gray-200 hover:border-brand-300 hover:shadow-md rounded-xl transition-all flex items-center gap-4 group text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-brand-600 font-semibold text-lg">
                    {getSessionStageName(session.currentStage).charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{session.title}</h3>
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                      {getSessionStageName(session.currentStage)}
                    </span>
                    {session.payment?.status === 'paid' && (
                      <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Paid
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {session.topic} • {formatDate(session.lastAccessedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSession(session.id)
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete session"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
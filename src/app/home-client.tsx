'use client'

import Link from 'next/link'
import { User } from '@/types'

interface Props {
  user: { id: string; email?: string | null; fullName?: string | null } | null
}

export default function HomeClient({ user }: Props) {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg">
            S
          </div>
          <span className="brand-wordmark text-xl font-bold text-gray-900">Skeelus</span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <Link
              href="/dashboard"
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-5 py-2.5 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-3xl text-center">
          {/* Stage indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {['🎯', '📖', '🛠️', '💪', '🏆'].map((emoji, i) => (
              <div key={i} className="flex items-center">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-indigo-100 flex items-center justify-center text-xl">
                  {emoji}
                </div>
                {i < 4 && (
                  <svg className="w-4 h-4 text-gray-300 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>

          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Learn Real Skills.<br />
            <span className="text-brand-600">Get Verified.</span>
          </h1>
          <p className="text-xl text-gray-500 mb-8 max-w-xl mx-auto">
            Describe what you want to learn. Our AI builds a personalized course with
            real-world practice and a certificate you can share.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold text-gray-900 mb-2">AI-Generated Curriculum</h3>
              <p className="text-sm text-gray-600">
                We research the topic deeply and build a custom learning path with theories,
                case studies, and practical concepts.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="text-3xl mb-3">🛠️</div>
              <h3 className="font-semibold text-gray-900 mb-2">Guided Practice</h3>
              <p className="text-sm text-gray-600">
                Learn by doing. Record videos, complete scenarios, and build an action plan
                you can actually use.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="text-3xl mb-3">🏆</div>
              <h3 className="font-semibold text-gray-900 mb-2">Verified Certificate</h3>
              <p className="text-sm text-gray-600">
                Get a unique certificate ID and shareable portfolio proving your new skills
                to employers or clients.
              </p>
            </div>
          </div>

          {/* CTA */}
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors text-lg"
            >
              Go to Dashboard
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors text-lg"
              >
                Start Learning Free
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-colors text-lg border border-gray-200"
              >
                Try Demo
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-gray-400">
        <p>Learn · Teach · Apply · Implement · Get Verified</p>
      </footer>
    </div>
  )
}
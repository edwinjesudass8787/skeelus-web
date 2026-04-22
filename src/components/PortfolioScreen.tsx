'use client'

import { Award, Download, Share2, CheckCircle } from 'lucide-react'
import { Portfolio } from '@/types'
import Link from 'next/link'

interface Props {
  portfolio: Portfolio
  onRestart: () => void
}

export default function PortfolioScreen({ portfolio, onRestart }: Props) {
  const copyCertificateLink = () => {
    const link = `${window.location.origin}/certificate/${portfolio.certificateId}`
    navigator.clipboard.writeText(link)
    alert('Certificate link copied to clipboard!')
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-brand-50 to-indigo-50'>
      <div className='max-w-4xl mx-auto px-6 py-12'>
        {/* Hero */}
        <div className='text-center mb-12'>
          <div className='inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white mb-6 shadow-xl'>
            <Award className='w-12 h-12' />
          </div>
          <h1 className='text-4xl font-bold text-gray-900 mb-3'>Congratulations!</h1>
          <p className='text-xl text-gray-600'>You&apos;ve completed your learning journey in {portfolio.topic}</p>
        </div>

        {/* Certificate Card */}
        <div className='bg-white rounded-3xl shadow-xl overflow-hidden mb-8'>
          <div className='bg-gradient-to-r from-brand-600 to-indigo-600 px-8 py-6 text-white'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                <div className='w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-bold text-2xl'>
                  S
                </div>
                <div>
                  <p className='text-sm font-medium opacity-80'>Skeelus Certificate of Completion</p>
                  <p className='text-2xl font-bold'>Verified Skills</p>
                </div>
              </div>
              <div className='text-right'>
                <p className='text-sm opacity-80'>Certificate ID</p>
                <p className='font-mono font-bold'>{portfolio.certificateId}</p>
              </div>
            </div>
          </div>

          <div className='p-8'>
            <div className='text-center mb-8'>
              <p className='text-gray-500 mb-2'>This certifies that you have successfully completed</p>
              <h2 className='text-3xl font-bold text-gray-900 mb-4'>{portfolio.topic}</h2>
              <p className='text-gray-600 max-w-xl mx-auto'>
                Through our 5-stage learning journey, you demonstrated understanding of key concepts,
                applied your knowledge in practical scenarios, and created an actionable plan for implementation.
              </p>
            </div>

            {/* Stats */}
            <div className='grid grid-cols-3 gap-6 mb-8'>
              <div className='text-center'>
                <div className='text-3xl font-bold text-brand-600'>{portfolio.curriculum.concepts.length}</div>
                <div className='text-sm text-gray-500'>Core Concepts</div>
              </div>
              <div className='text-center'>
                <div className='text-3xl font-bold text-purple-600'>{portfolio.curriculum.academicTheories?.length || 0}</div>
                <div className='text-sm text-gray-500'>Theories Explored</div>
              </div>
              <div className='text-center'>
                <div className='text-3xl font-bold text-emerald-600'>{portfolio.curriculum.caseStudies?.length || 0}</div>
                <div className='text-sm text-gray-500'>Case Studies</div>
              </div>
            </div>

            {/* Completed Date */}
            <div className='text-center text-sm text-gray-400'>
              Completed on {new Date(portfolio.completedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className='flex flex-col sm:flex-row gap-4 mb-8'>
          <button
            onClick={copyCertificateLink}
            className='flex-1 py-3 bg-white border border-gray-200 hover:border-brand-300 text-gray-700 font-medium rounded-xl transition-colors flex items-center justify-center gap-2'
          >
            <Share2 className='w-5 h-5' />
            Share Certificate
          </button>
          <Link
            href={`/certificate/${portfolio.certificateId}`}
            className='flex-1 py-3 bg-white border border-gray-200 hover:border-brand-300 text-gray-700 font-medium rounded-xl transition-colors flex items-center justify-center gap-2'
          >
            <Award className='w-5 h-5' />
            View Public Certificate
          </Link>
        </div>

        {/* What You Learned */}
        <div className='bg-white rounded-2xl border border-gray-200 p-6 mb-8'>
          <h3 className='font-semibold text-gray-900 mb-4'>📚 Key Concepts Covered</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            {portfolio.curriculum.concepts.map((concept) => (
              <div key={concept.id} className='flex items-start gap-2 text-sm'>
                <CheckCircle className='w-4 h-4 text-green-500 mt-0.5 shrink-0' />
                <span className='text-gray-700'>{concept.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className='text-center'>
          <button
            onClick={onRestart}
            className='px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors'
          >
            Start New Learning Session
          </button>
        </div>
      </div>
    </div>
  )
}

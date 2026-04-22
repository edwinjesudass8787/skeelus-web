'use client'

import { useState } from 'react'
import { Lightbulb, CheckCircle, Loader2, Video, AlertTriangle } from 'lucide-react'
import { VideoPresentation, VideoEvaluation, Concept } from '@/types'
import { generateCaseStudyScenario, evaluateVideoTranscript } from '@/lib/openrouter'

interface Props {
  sessionId: string
  topic: string
  concepts: Concept[]
  onComplete: (video: VideoPresentation, evaluation: VideoEvaluation) => void
}

export default function CaseStudyPractice({ sessionId, topic, concepts, onComplete }: Props) {
  const [scenario, setScenario] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [transcript, setTranscript] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [evaluation, setEvaluation] = useState<VideoEvaluation | null>(null)

  // Load scenario on mount
  useState(() => {
    loadScenario()
  })

  const loadScenario = async () => {
    setLoading(true)
    try {
      const result = await generateCaseStudyScenario(topic, concepts)
      setScenario(result)
    } catch (e) {
      console.error('Failed to generate scenario:', e)
    }
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!transcript.trim()) {
      alert('Please provide your response.')
      return
    }

    setSubmitting(true)
    try {
      const result = await evaluateVideoTranscript(transcript, topic, concepts)
      setEvaluation(result)

      if (result.canProceed) {
        const presentation: VideoPresentation = {
          videoUrl: '',
          transcript,
          duration: 0,
          recordedAt: Date.now()
        }
        onComplete(presentation, result)
      }
    } catch (e) {
      console.error('Evaluation failed:', e)
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-brand-500' />
      </div>
    )
  }

  if (!scenario) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <p className='text-gray-500'>Failed to load scenario. Please try again.</p>
      </div>
    )
  }

  return (
    <div className='flex-1 overflow-y-auto'>
      <div className='max-w-3xl mx-auto px-6 py-8'>
        {/* Scenario Header */}
        <div className='bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white mb-6'>
          <div className='flex items-center gap-2 mb-2'>
            <Lightbulb className='w-5 h-5' />
            <span className='text-sm font-medium opacity-80'>Case Study Practice</span>
          </div>
          <h2 className='text-2xl font-bold mb-3'>{scenario.title}</h2>
          <p className='text-white/90 leading-relaxed'>{scenario.description}</p>
        </div>

        {/* Context */}
        <div className='bg-white rounded-2xl border border-gray-200 p-6 mb-6'>
          <h3 className='font-semibold text-gray-900 mb-3'>📋 Context</h3>
          <p className='text-gray-700'>{scenario.context}</p>
        </div>

        {/* Challenge */}
        <div className='bg-amber-50 rounded-2xl border border-amber-200 p-6 mb-6'>
          <div className='flex items-center gap-2 mb-3'>
            <AlertTriangle className='w-5 h-5 text-amber-600' />
            <h3 className='font-semibold text-amber-900'>Your Challenge</h3>
          </div>
          <p className='text-amber-800 font-medium mb-4'>{scenario.challenge}</p>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <h4 className='text-sm font-medium text-amber-800 mb-2'>Constraints</h4>
              <ul className='text-sm text-amber-700 list-disc list-inside space-y-1'>
                {scenario.constraints.map((c: string, i: number) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className='text-sm font-medium text-amber-800 mb-2'>Success Criteria</h4>
              <ul className='text-sm text-amber-700 list-disc list-inside space-y-1'>
                {scenario.successCriteria.map((c: string, i: number) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* What to Include */}
        <div className='bg-brand-50 rounded-2xl border border-brand-200 p-6 mb-6'>
          <h3 className='font-semibold text-brand-900 mb-3'>✅ What to Include in Your Response</h3>
          <ul className='space-y-2'>
            {scenario.whatToInclude.map((item: string, i: number) => (
              <li key={i} className='flex items-start gap-2 text-brand-800 text-sm'>
                <CheckCircle className='w-4 h-4 mt-0.5 shrink-0' />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Response Input */}
        <div className='bg-white rounded-2xl border border-gray-200 p-6 mb-6'>
          <h3 className='font-semibold text-gray-900 mb-3'>📝 Your Response</h3>
          <p className='text-sm text-gray-500 mb-4'>
            Record a video or write out your response explaining how you would handle this scenario.
          </p>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder='Describe your approach to this scenario. How would you apply what you learned?...'
            rows={8}
            className='w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all resize-none'
          />
        </div>

        {/* Evaluation */}
        {evaluation && (
          <div className={`rounded-2xl p-6 mb-6 ${evaluation.canProceed ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className='flex items-center gap-3 mb-3'>
              {evaluation.canProceed ? (
                <CheckCircle className='w-6 h-6 text-green-600' />
              ) : (
                <Loader2 className='w-6 h-6 text-amber-600' />
              )}
              <h3 className='font-semibold text-lg'>
                {evaluation.canProceed ? 'Excellent work!' : 'Keep practicing'}
              </h3>
            </div>
            <p className='text-gray-700'>{evaluation.feedback}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !transcript.trim()}
          className='w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2'
        >
          {submitting ? (
            <>
              <Loader2 className='w-5 h-5 animate-spin' />
              Evaluating...
            </>
          ) : (
            <>
              <CheckCircle className='w-5 h-5' />
              Submit for Evaluation
            </>
          )}
        </button>
      </div>
    </div>
  )
}
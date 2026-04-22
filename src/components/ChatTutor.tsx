'use client'

import { useState, useRef, useEffect } from 'react'
import { Loader2, Send, Sparkles } from 'lucide-react'
import { Message, Concept } from '@/types'
import {
  generateTutorQuestion,
  evaluateTutorResponse,
  checkUnderstandingMilestone,
  TutorQuestion,
  TutorEvaluation
} from '@/lib/openrouter'

const STORAGE_KEY_PREFIX = 'chat-messages-'

interface Props {
  sessionId: string
  topic: string
  concepts: Concept[]
  requiredCorrect: number
  onMilestoneReached: (demonstratedConcepts: string[], milestoneResult: any) => void
}

export default function ChatTutor({ sessionId, topic, concepts, requiredCorrect, onMilestoneReached }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<TutorQuestion | null>(null)
  const [evaluations, setEvaluations] = useState<TutorEvaluation[]>([])
  const [waitingForInput, setWaitingForInput] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load saved messages
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + sessionId)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setMessages(parsed)
      } catch {}
    }
    // Generate first question
    generateFirstQuestion()
  }, [sessionId])

  // Save messages
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + sessionId, JSON.stringify(messages))
  }, [messages, sessionId])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when waiting
  useEffect(() => {
    if (waitingForInput) {
      inputRef.current?.focus()
    }
  }, [waitingForInput])

  const generateFirstQuestion = async () => {
    setLoading(true)
    try {
      const question = await generateTutorQuestion(topic, concepts, [])
      setCurrentQuestion(question)
      setWaitingForInput(true)

      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        role: 'assistant',
        content: question.question,
        timestamp: Date.now()
      }])
    } catch (e) {
      console.error('Failed to generate question:', e)
    }
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!input.trim() || !currentQuestion) return

    const answer = input.trim()
    setInput('')
    setLoading(true)

    // Add user message
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: answer,
      timestamp: Date.now()
    }])

    try {
      // Evaluate the answer
      const evaluation = await evaluateTutorResponse(currentQuestion, answer, concepts)
      setEvaluations(prev => [...prev, evaluation])

      // Add evaluation feedback
      setMessages(prev => [...prev, {
        id: `eval-${Date.now()}`,
        role: 'assistant',
        content: evaluation.feedback,
        timestamp: Date.now()
      }])

      // If needs follow-up, ask follow-up question
      if (evaluation.needsFollowUp && evaluation.followUpQuestion) {
        setMessages(prev => [...prev, {
          id: `followup-${Date.now()}`,
          role: 'assistant',
          content: evaluation.followUpQuestion!,
          timestamp: Date.now()
        }])
        setWaitingForInput(true)
      } else {
        // Check if we've reached the milestone
        const strongEvals = evaluations.filter(e => e.understandingLevel === 'strong' || e.isCorrect)
        if (strongEvals.length >= requiredCorrect) {
          const milestone = await checkUnderstandingMilestone(topic, concepts, [], [...evaluations, evaluation])
          onMilestoneReached(milestone.conceptsDemonstrated, milestone)
        } else {
          // Generate next question
          const history = messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }))
          const nextQuestion = await generateTutorQuestion(topic, concepts, history)
          setCurrentQuestion(nextQuestion)

          setTimeout(() => {
            setMessages(prev => [...prev, {
              id: `q-${Date.now()}`,
              role: 'assistant',
              content: nextQuestion.question,
              timestamp: Date.now()
            }])
            setWaitingForInput(true)
          }, 1500)
        }
      }
    } catch (e) {
      console.error('Evaluation error:', e)
      setWaitingForInput(true)
    }

    setLoading(false)
  }

  return (
    <div className='flex-1 flex flex-col overflow-hidden'>
      {/* Messages */}
      <div className='flex-1 overflow-y-auto px-6 py-4'>
        <div className='max-w-2xl mx-auto space-y-4'>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  message.role === 'user'
                    ? 'bg-brand-600 text-white'
                    : message.content.startsWith('Great') || message.content.startsWith('Thanks')
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className='flex items-center gap-2 mb-1'>
                    <Sparkles className='w-3 h-3 text-brand-500' />
                    <span className='text-xs font-medium text-gray-400'>Tutor</span>
                  </div>
                )}
                <p className='whitespace-pre-wrap'>{message.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className='flex justify-start'>
              <div className='bg-white border border-gray-200 rounded-2xl px-4 py-3'>
                <Loader2 className='w-4 h-4 animate-spin text-brand-500' />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className='border-t border-gray-100 px-6 py-4 bg-white'>
        <div className='max-w-2xl mx-auto'>
          <div className='flex gap-3'>
            <input
              ref={inputRef}
              type='text'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleSubmit()}
              placeholder='Type your answer in your own words...'
              disabled={loading || !waitingForInput}
              className='flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400'
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !input.trim() || !waitingForInput}
              className='px-5 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors flex items-center gap-2'
            >
              <Send className='w-4 h-4' />
            </button>
          </div>
          <p className='text-xs text-gray-400 mt-2 text-center'>
            Answer in your own words — there are no wrong answers, just opportunities to learn.
          </p>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useRef } from 'react'
import { Video, Mic, MicOff, Play, Square, RefreshCw, CheckCircle, Loader2 } from 'lucide-react'
import { VideoPresentation, VideoEvaluation, VideoAttempt, Concept } from '@/types'
import { evaluateVideoTranscript } from '@/lib/openrouter'

const RECORDING_MAX_DURATION = 300 // 5 minutes

interface Props {
  sessionId: string
  topic: string
  concepts: Concept[]
  onComplete: (video: VideoPresentation, evaluation: VideoEvaluation) => void
  existingVideo?: VideoPresentation
  existingAttempts?: VideoAttempt[]
}

export default function VideoPresentationComponent({
  sessionId,
  topic,
  concepts,
  onComplete,
  existingVideo,
  existingAttempts = []
}: Props) {
  const [recording, setRecording] = useState(false)
  const [recorded, setRecorded] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(existingVideo?.videoUrl || null)
  const [transcript, setTranscript] = useState(existingVideo?.transcript || '')
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(false)
  const [evaluation, setEvaluation] = useState<VideoEvaluation | null>(existingVideo ? {
    canProceed: true,
    feedback: 'Video submitted successfully.',
    overallScore: 100,
    conceptsCovered: concepts.map(c => c.id),
    conceptsMissing: [],
    conceptsPartial: [],
    overallReadiness: 'ready'
  } : null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [attempts, setAttempts] = useState<VideoAttempt[]>(existingAttempts)
  const [micEnabled, setMicEnabled] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: micEnabled
      })
      setStream(mediaStream)
      videoRef.current!.srcObject = mediaStream
      videoRef.current!.play()

      const recorder = new MediaRecorder(mediaStream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'
      })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        const url = URL.createObjectURL(blob)
        setVideoUrl(url)
        setRecorded(true)
        setRecording(false)

        // Stop all tracks
        mediaStream.getTracks().forEach(track => track.stop())
        setStream(null)
      }

      recorder.start(1000)
      setMediaRecorder(recorder)
      setRecording(true)

      // Auto-stop after max duration
      setTimeout(() => {
        if (recording) {
          stopRecording()
        }
      }, RECORDING_MAX_DURATION * 1000)
    } catch (e) {
      console.error('Failed to start recording:', e)
      alert('Could not access camera. Please ensure you have given permission.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop()
      setRecording(false)
    }
  }

  const evaluateVideo = async () => {
    if (!transcript.trim()) {
      alert('Please provide a transcript of your video.')
      return
    }

    setLoading(true)
    try {
      const result = await evaluateVideoTranscript(transcript, topic, concepts)
      setEvaluation(result)

      if (result.canProceed) {
        const presentation: VideoPresentation = {
          videoUrl: videoUrl!,
          transcript,
          duration,
          recordedAt: Date.now()
        }
        onComplete(presentation, result)
      }
    } catch (e) {
      console.error('Evaluation failed:', e)
    }
    setLoading(false)
  }

  const resetRecording = () => {
    setVideoUrl(null)
    setTranscript('')
    setRecorded(false)
    setEvaluation(null)
    setDuration(0)
  }

  return (
    <div className='flex-1 flex flex-col overflow-hidden'>
      <div className='max-w-3xl mx-auto px-6 py-8 w-full'>
        {/* Instructions */}
        <div className='bg-brand-50 rounded-2xl p-6 mb-6'>
          <h2 className='text-lg font-semibold text-brand-900 mb-3'>📹 Record Your Presentation</h2>
          <p className='text-brand-800 text-sm leading-relaxed mb-4'>
            Explain the key concepts you've learned in your own words. Teach like you're explaining
            to a colleague or friend. Aim for 3-5 minutes.
          </p>
          <div className='text-sm text-brand-700'>
            <p className='font-medium mb-2'>What to cover:</p>
            <ul className='list-disc list-inside space-y-1'>
              {concepts.slice(0, 4).map((concept) => (
                <li key={concept.id}>{concept.title}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Video Preview / Recording */}
        <div className='bg-gray-900 rounded-2xl overflow-hidden mb-6 aspect-video relative'>
          {stream || videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl || undefined}
              className='w-full h-full object-cover'
              muted={!videoUrl}
              playsInline
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center text-gray-400'>
              <div className='text-center'>
                <Video className='w-12 h-12 mx-auto mb-2' />
                <p>Camera preview will appear here</p>
              </div>
            </div>
          )}

          {/* Recording indicator */}
          {recording && (
            <div className='absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-medium'>
              <span className='w-2 h-2 bg-white rounded-full animate-pulse' />
              Recording
            </div>
          )}
        </div>

        {/* Controls */}
        <div className='flex items-center justify-center gap-4 mb-6'>
          {!recording && !recorded && (
            <>
              <button
                onClick={() => setMicEnabled(!micEnabled)}
                className={`p-3 rounded-xl ${micEnabled ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-600'}`}
                title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {micEnabled ? <Mic className='w-5 h-5' /> : <MicOff className='w-5 h-5' />}
              </button>
              <button
                onClick={startRecording}
                className='px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2'
              >
                <Record className='w-5 h-5' />
                Start Recording
              </button>
            </>
          )}

          {recording && (
            <button
              onClick={stopRecording}
              className='px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors flex items-center gap-2'
            >
              <Square className='w-5 h-5' />
              Stop Recording
            </button>
          )}

          {recorded && (
            <>
              <button
                onClick={resetRecording}
                className='px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors flex items-center gap-2'
              >
                <RefreshCw className='w-5 h-5' />
                Record Again
              </button>
            </>
          )}
        </div>

        {/* Transcript Input */}
        {(recorded || transcript) && (
          <div className='mb-6'>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Transcript (paste or type what you said in your video)
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder='Type or paste your video transcript here...'
              rows={6}
              className='w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all resize-none'
            />
          </div>
        )}

        {/* Evaluation Results */}
        {evaluation && (
          <div className={`rounded-2xl p-6 mb-6 ${evaluation.canProceed ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className='flex items-center gap-3 mb-3'>
              {evaluation.canProceed ? (
                <CheckCircle className='w-6 h-6 text-green-600' />
              ) : (
                <Loader2 className='w-6 h-6 text-amber-600' />
              )}
              <h3 className='font-semibold text-lg'>
                {evaluation.canProceed ? 'Great job!' : 'Keep practicing'}
              </h3>
            </div>
            <p className='text-gray-700 mb-4'>{evaluation.feedback}</p>
            <div className='text-sm text-gray-600'>
              <p><strong>Score:</strong> {evaluation.overallScore}/100</p>
              <p><strong>Concepts Covered:</strong> {evaluation.conceptsCovered.length} of {concepts.length}</p>
              {evaluation.conceptsMissing.length > 0 && (
                <p className='text-amber-700'><strong>Missing:</strong> {evaluation.conceptsMissing.length} concepts</p>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        {(recorded || transcript) && !evaluation && (
          <button
            onClick={evaluateVideo}
            disabled={loading || !transcript.trim()}
            className='w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2'
          >
            {loading ? (
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
        )}

        {/* Previous Attempts */}
        {attempts.length > 0 && (
          <div className='mt-8'>
            <h3 className='font-semibold text-gray-900 mb-3'>Previous Attempts</h3>
            <div className='space-y-3'>
              {attempts.slice(-3).reverse().map((attempt, i) => (
                <div key={attempt.id} className='bg-gray-50 rounded-xl p-4 text-sm'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='font-medium'>Attempt {attempts.length - i}</span>
                    <span className='text-gray-500'>
                      {Math.floor(attempt.presentation.duration / 60)}:{(attempt.presentation.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  {attempt.evaluation && (
                    <p className='text-gray-600'>Score: {attempt.evaluation.overallScore}/100</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Record(props: any) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' {...props}>
      <circle cx='12' cy='12' r='8' />
    </svg>
  )
}
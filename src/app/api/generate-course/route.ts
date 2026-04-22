import { NextResponse } from 'next/server'
import { runFullPipeline, createSession } from '@/lib/pipeline'
import { generateSessionTitle } from '@/lib/openrouter'

export async function POST(request: Request) {
  try {
    const { topic } = await request.json()

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    const { curriculum } = await runFullPipeline(topic)
    const sessionTitle = await generateSessionTitle(topic, curriculum)
    const session = createSession(sessionTitle, topic, curriculum)

    return NextResponse.json({ session })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate course' },
      { status: 500 }
    )
  }
}

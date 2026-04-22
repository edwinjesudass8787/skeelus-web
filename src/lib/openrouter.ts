// OpenRouter API Client for Web - server-side proxy
// Model usage per user spec:
// - sonar (perplexity): Web context retrieval
// - openai/gpt-4.1-nano: Chat, curriculum, evaluation
// - bytedance-seed/seedream-4.5: Visual generation

import { OpenRouterMessage, OpenRouterRequest, OpenRouterResponse, MODELS } from '../types'

export interface ApiClient {
  apiKey: string
}

export function createApiClient(apiKey: string): ApiClient {
  return { apiKey }
}

// Server-side OpenRouter API call
export async function openRouterChatComplete(
  request: OpenRouterRequest
): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  let response: Response

  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://skeelus.vercel.app',
        'X-Title': 'Skeelus',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('OpenRouter request timed out after 20 seconds')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenRouter error ${response.status}: ${text}`)
  }

  return response.json()
}

// Generic chat completion via server-side proxy
export async function chatComplete(
  model: string,
  messages: OpenRouterMessage[],
  options: { temperature?: number; maxTokens?: number; stream?: boolean } = {}
): Promise<string> {
  const request: OpenRouterRequest = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
    stream: options.stream ?? false
  }

  const data = await openRouterChatComplete(request)
  return data.choices[0]?.message?.content || ''
}

// Web search using Perplexity Sonar
export async function getWebContext(topic: string): Promise<string | null> {
  try {
    const response = await chatComplete(MODELS.sonar, [
      {
        role: 'user',
        content: `Search for the latest and most relevant information about "${topic}". Return a brief summary (3-4 sentences) of the current state, trends, and key developments. Focus on practical, real-world applications.`
      }
    ], { maxTokens: 500 })

    return response.trim()
  } catch (e) {
    console.warn('Web search failed:', e)
    return null
  }
}

// Get case studies for a topic
export async function getCaseStudies(topic: string) {
  try {
    const response = await chatComplete(MODELS.sonar, [
      {
        role: 'user',
        content: `Find 2-3 recent, notable case studies related to "${topic}". Return as JSON array with: title, organization, year, summary, keyTakeaways (array), source.`
      }
    ], { maxTokens: 1500 })

    try {
      return JSON.parse(response)
    } catch {
      return []
    }
  } catch (e) {
    console.warn('Case studies search failed:', e)
    return []
  }
}

// Get academic theories for a topic
export async function getAcademicTheories(topic: string) {
  try {
    const response = await chatComplete(MODELS.gpt4oMini, [
      {
        role: 'user',
        content: `Identify 2-4 influential academic theories, frameworks, or established models directly relevant to "${topic}". Return as JSON array with: name, author, year, description, relevance.`
      }
    ], { maxTokens: 1500 })

    try {
      return JSON.parse(response)
    } catch {
      return []
    }
  } catch (e) {
    console.warn('Academic theories search failed:', e)
    return []
  }
}

// Detect vague input
export async function detectVagueInput(input: string): Promise<{ isVague: boolean; clarificationQuestion?: string; suggestedTopics?: string[] }> {
  const systemPrompt = `You are a learning pathway assistant. Determine if the user's learning goal is specific enough to generate a curriculum.

Vague inputs include:
- Very broad topics ("something in tech", "business", "skills", "management", "leadership")
- Generic goals ("learn stuff", "get better at things", "improve")

Specific inputs include:
- Specific skills ("machine learning engineering", "financial modeling with Excel")
- Defined goals with context ("become a frontend developer")
- Clear outcomes with scope ("understand blockchain basics")

Respond with JSON only:
{"isVague": true/false, "clarificationQuestion": "one focused question if vague", "suggestedTopics": ["topic1", "topic2"] if vague}`

  try {
    const response = await chatComplete(MODELS.gpt4oMini, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input }
    ])

    return JSON.parse(response)
  } catch {
    return { isVague: false }
  }
}

// Generate curriculum
export async function generateCurriculum(
  topic: string,
  webContext?: string,
  academicTheories?: any[],
  caseStudies?: any[]
): Promise<string> {
  const contextSection = webContext ? `\n\nCurrent context:\n${webContext}` : ''
  const theoriesSection = academicTheories?.length
    ? `\n\nReference Academic Theories:\n${academicTheories.map((t: any) => `- ${t.name}: ${t.description}`).join('\n')}`
    : ''
  const casesSection = caseStudies?.length
    ? `\n\nReference Case Studies:\n${caseStudies.map((c: any) => `- ${c.title}: ${c.summary}`).join('\n')}`
    : ''

  const systemPrompt = `You are a curriculum designer for Skeelus. Generate a comprehensive learning curriculum.

Return JSON only with this structure:
{
  "whyItMatters": "...",
  "bigPicture": "...",
  "concepts": [{"id": "c1", "title": "...", "explanation": "..."}],
  "commonMisconceptions": ["..."],
  "academicTheories": [{"name": "...", "author": "...", "year": 1990, "description": "...", "relevance": "..."}],
  "caseStudies": [{"title": "...", "organization": "...", "year": 2024, "summary": "...", "keyTakeaways": ["..."]}],
  "quizQuestions": [{"id": "...", "conceptId": "...", "question": "...", "options": [...], "correctAnswer": 0, "explanation": "...", "difficulty": "easy"}]
}

Generate 4-6 core concepts. Be specific and practical.${contextSection}${theoriesSection}${casesSection}`

  return chatComplete(MODELS.gpt4oMini, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: topic }
  ])
}

// Generate session title
export async function generateSessionTitle(topic: string, curriculum: any): Promise<string> {
  const systemPrompt = `Generate a SHORT, ENGAGING title (4-7 words) for a learning session. Be specific and descriptive. No quotes, no explanation.`

  const conceptsSummary = curriculum.concepts.map((c: any) => c.title).join(', ')

  return chatComplete(MODELS.gpt4oMini, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Topic: ${topic}\nCore concepts: ${conceptsSummary}\nWhy it matters: ${curriculum.whyItMatters}` }
  ])
}

// Classify visual type
export async function classifyVisualType(conceptTitle: string, conceptExplanation: string): Promise<{ visualType: string; spec: string }> {
  const systemPrompt = `You are a visual learning designer. Determine the best visual representation for a concept.

Visual types: flowchart, concept_map, bar_chart, radar_chart, timeline, comparison_table, process_diagram

Return JSON: {"visualType": "type", "spec": "brief description of what to show"}`

  try {
    const response = await chatComplete(MODELS.geminiFlash, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Concept: ${conceptTitle}\nExplanation: ${conceptExplanation}` }
    ])

    return JSON.parse(response)
  } catch {
    return { visualType: 'concept_map', spec: conceptExplanation }
  }
}

// Generate visual using ByteDance Seed
export async function generateVisual(conceptTitle: string, visualType: string, spec: string): Promise<string> {
  const systemPrompt = `Create an educational, visually appealing image (1024x1024) for learning. Use blues, greens, warm tones. Include text labels.`

  const request: OpenRouterRequest = {
    model: MODELS.seedream,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Create a ${visualType} image for: ${conceptTitle}. ${spec}` }
    ]
  }

  const data = await openRouterChatComplete(request)
  const images = data.choices?.[0]?.message?.images
  if (images?.length) {
    return images[0].image_url.url
  }
  return data.choices?.[0]?.message?.content || ''
}

// Tutoring functions
export interface TutorQuestion {
  id: string
  conceptId: string
  question: string
  followUp?: string
}

export interface TutorEvaluation {
  conceptId?: string
  understandingLevel: 'strong' | 'partial' | 'weak'
  isCorrect: boolean
  feedback: string
  needsFollowUp: boolean
  followUpQuestion?: string
  knowledgeGap?: string
  encouragement?: string
}

export interface UnderstandingMilestone {
  conceptsDemonstrated: string[]
  conceptsNeedingWork: string[]
  overallReadiness: 'ready' | 'almost_ready' | 'needs_more_practice'
  summary: string
}

export async function generateTutorQuestion(
  topic: string,
  concepts: any[],
  conversationHistory: any[]
): Promise<TutorQuestion> {
  const systemPrompt = `You are a patient, encouraging tutor conducting a conversational assessment.

Generate ONE thoughtful, open-ended question that:
1. Tests genuine understanding, not just definitions
2. Asks them to explain, apply, or connect concepts
3. Is encouraging and makes them feel safe to share their thinking

Return JSON only:
{"id": "unique-id", "conceptId": "the-concept-id", "question": "your question here", "followUp": "optional hint"}`

  const conceptsJson = concepts.map((c: any) => `• ${c.id}: ${c.title} - ${c.explanation}`).join('\n')

  try {
    const response = await chatComplete(MODELS.gpt4oMini, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Topic: ${topic}\n\nConcepts:\n${conceptsJson}\n\nGenerate one tutoring question.` }
    ])

    return JSON.parse(response)
  } catch {
    return {
      id: `fallback-${Date.now()}`,
      conceptId: concepts[0]?.id || 'unknown',
      question: `Can you explain what ${topic} means to you in your own words?`
    }
  }
}

export async function evaluateTutorResponse(
  question: TutorQuestion,
  learnerAnswer: string,
  concepts: any[]
): Promise<TutorEvaluation> {
  const systemPrompt = `You are an insightful tutor evaluating a learner's understanding. Be fair, encouraging, and thorough.

Give credit for partial understanding (60-80% = acknowledge what they know and gently fill gaps).

Return JSON:
{
  "understandingLevel": "strong|partial|weak",
  "isCorrect": true/false,
  "feedback": "2-3 sentence encouraging feedback",
  "needsFollowUp": true/false,
  "followUpQuestion": "brief follow-up if needed",
  "knowledgeGap": "what they're missing (1 sentence)",
  "encouragement": "something positive (1 sentence)"
}`

  const concept = concepts.find((c: any) => c.id === question.conceptId)

  try {
    const response = await chatComplete(MODELS.gpt4oMini, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Question: ${question.question}\nConcept: ${question.conceptId} (${concept?.title || 'Unknown'})\nLearner's answer: ${learnerAnswer}\n\nAll concepts:\n${concepts.map((c: any) => `• ${c.title}: ${c.explanation}`).join('\n')}` }
    ])

    return JSON.parse(response)
  } catch {
    return {
      understandingLevel: 'partial',
      isCorrect: true,
      feedback: 'Thanks for sharing!',
      needsFollowUp: true,
      followUpQuestion: 'Can you tell me more?',
      encouragement: "You're on the right track!"
    }
  }
}

export async function checkUnderstandingMilestone(
  topic: string,
  concepts: any[],
  conversationHistory: any[],
  evaluations: TutorEvaluation[]
): Promise<UnderstandingMilestone> {
  const systemPrompt = `You are an assessment judge determining if a learner is ready to move to the next stage.

Based on the conversation and evaluations, determine:
1. Which concepts did they demonstrate strong understanding?
2. Which concepts need more work?
3. Overall readiness for next stage

Be fair but not overly strict. Pass if they demonstrate understanding of MOST key concepts.

Return JSON:
{
  "conceptsDemonstrated": ["concept-id-1"],
  "conceptsNeedingWork": ["concept-id-2"],
  "overallReadiness": "ready|almost_ready|needs_more_practice",
  "summary": "2-3 sentence summary"
}`

  const evalSummary = evaluations.map((e, i) =>
    `Q${i + 1}: Level=${e.understandingLevel}, Correct=${e.isCorrect}`
  ).join('\n')

  try {
    const response = await chatComplete(MODELS.gpt4oMini, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Topic: ${topic}\nConcepts: ${concepts.map((c: any) => `• ${c.id}: ${c.title}`).join('\n')}\n\nEvaluations:\n${evalSummary}\n\nDetermine readiness.` }
    ])

    return JSON.parse(response)
  } catch {
    const strongEvals = evaluations.filter(e => e.understandingLevel === 'strong')
    const conceptsDemo = strongEvals
      .map(e => e.conceptId)
      .filter((conceptId): conceptId is string => Boolean(conceptId))
    const conceptsNeedingWork = evaluations
      .filter(e => e.understandingLevel === 'weak')
      .map(e => e.conceptId)
      .filter((conceptId): conceptId is string => Boolean(conceptId))

    return {
      conceptsDemonstrated: conceptsDemo,
      conceptsNeedingWork,
      overallReadiness: conceptsDemo.length >= Math.ceil(evaluations.length / 2) ? 'ready' : 'almost_ready',
      summary: 'Based on the conversation, you seem ready to continue.'
    }
  }
}

// Video transcript evaluation
export interface VideoEvaluationResult {
  canProceed: boolean
  feedback: string
  overallScore: number
  conceptsCovered: string[]
  conceptsMissing: string[]
  conceptsPartial: string[]
  overallReadiness: 'ready' | 'needs_more_practice'
}

export async function evaluateVideoTranscript(
  transcript: string,
  topic: string,
  concepts: any[]
): Promise<VideoEvaluationResult> {
  const systemPrompt = `You are an assessment judge evaluating a learner's video presentation.

Evaluate each concept:
1. CLARITY (0-33): Did they explain clearly?
2. APPLICATION (0-33): Did they provide examples?
3. DEPTH (0-34): Did they show understanding beyond definitions?

Scoring: Strong (70-100), Partial (40-69), Missing (0-39)
Learner must demonstrate understanding of MOST core concepts.

Return JSON:
{
  "canProceed": true/false,
  "feedback": "2-3 sentence summary",
  "overallScore": 0-100,
  "conceptsCovered": ["concept-id-1"],
  "conceptsMissing": ["concept-id-2"],
  "conceptsPartial": ["concept-id-3"],
  "overallReadiness": "ready|needs_more_practice"
}`

  const conceptsJson = concepts.map((c: any) => `- ${c.id}: ${c.title}\n  ${c.explanation}`).join('\n')

  try {
    const response = await chatComplete(MODELS.gpt4oMini, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Topic: ${topic}\n\nCore Concepts:\n${conceptsJson}\n\nLearner's Video Transcript:\n${transcript}\n\nEvaluate whether the learner demonstrated sufficient understanding.` }
    ])

    return JSON.parse(response)
  } catch {
    return {
      canProceed: false,
      feedback: 'Failed to evaluate transcript. Please try again.',
      overallScore: 0,
      conceptsCovered: [],
      conceptsMissing: concepts.map((c: any) => c.id),
      conceptsPartial: [],
      overallReadiness: 'needs_more_practice'
    }
  }
}

// Generate portfolio
export async function generatePortfolioReflection(
  topic: string,
  curriculum: any,
  stageEvidence: any
): Promise<string> {
  const systemPrompt = `You are a learning reflection assistant. Based on the learner's journey, generate a thoughtful summary.

Generate:
1. Key learnings summary
2. 2-3 reflection prompts
3. What they did well and what to focus on next

Be encouraging and specific.`

  return chatComplete(MODELS.gpt4oMini, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Topic: ${topic}\n\nCurriculum: ${JSON.stringify(curriculum)}\n\nStage Evidence: ${JSON.stringify(stageEvidence)}` }
  ])
}

// Generate case study scenario
export async function generateCaseStudyScenario(topic: string, concepts: any[]) {
  const systemPrompt = `You are a scenario designer for Skeelus. Generate a realistic case study scenario for a 5-minute video presentation.

Return JSON:
{
  "title": "scenario title",
  "description": "2-3 paragraph scenario",
  "context": "background context",
  "challenge": "specific challenge",
  "constraints": ["constraint1", "constraint2"],
  "successCriteria": ["criterion1", "criterion2"],
  "whatToInclude": ["point1", "point2", "point3", "point4"]
}

Keep whatToInclude to 4 items max for a 5-minute video.`

  try {
    const response = await chatComplete(MODELS.gpt4oMini, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Topic: ${topic}\n\nKey Concepts:\n${concepts.map((c: any) => `- ${c.title}: ${c.explanation}`).join('\n')}` }
    ], { temperature: 0.8 })

    return JSON.parse(response)
  } catch {
    return {
      title: `Applying ${topic} in a Real-World Context`,
      description: `You've been learning about ${topic}. Now it's time to put that knowledge into practice.`,
      context: `Professional scenario involving ${topic}`,
      challenge: `How would you approach this scenario using what you've learned?`,
      constraints: ['Consider key concepts', 'Think about implications', 'Explain your reasoning'],
      successCriteria: ['Correctly applies key concepts', 'Shows understanding of trade-offs', 'Provides practical guidance'],
      whatToInclude: ['Explain how you would apply key concepts', 'Describe your reasoning', 'Justify your approach']
    }
  }
}

// Evaluate action plan section
export async function evaluateActionPlanSection(
  sectionTitle: string,
  sectionSubtitle: string,
  studentInput: string,
  topic: string
): Promise<{ isGood: boolean; feedback: string; suggestions: string[]; score: number }> {
  const systemPrompt = `You are a helpful action plan mentor. Evaluate what they've written:

1. ACKNOWLEDGE what they've written - find something positive
2. Give constructive FEEDBACK - what could make this stronger?
3. Ask a PROBING QUESTION - help them think deeper
4. Give a SCORE from 1-10 based on thoughtfulness and actionability

Return JSON:
{"isGood": true/false (true if score >= 7), "feedback": "2-3 sentence feedback", "suggestions": ["1 suggestion"], "score": 1-10}`

  try {
    const response = await chatComplete(MODELS.gpt4oMini, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Section: ${sectionTitle}\nDescription: ${sectionSubtitle}\nTopic: ${topic}\n\nStudent's response:\n${studentInput}\n\nEvaluate this section.` }
    ], { temperature: 0.7 })

    return JSON.parse(response)
  } catch {
    return { isGood: true, feedback: 'Thanks for sharing!', suggestions: [], score: 7 }
  }
}

// Generate custom action plan fields
export async function generateCustomActionPlanFields(topic: string, concepts: any[]) {
  const systemPrompt = `You are an expert learning plan designer for Skeelus. Generate 4-6 customized action plan SECTIONS that are tailored to the topic.

Return JSON:
{
  "fields": [
    {"id": "camelCase", "title": "Section Title", "subtitle": "Description", "icon": "Target", "color": "violet", "placeholder": "Question prompt..."}
  ]
}

Icons available: Target, Clock, Calendar, Users, AlertTriangle, TrendingUp, BookOpen, Lightbulb, Zap, Star, CheckCircle, FileText
Colors available: violet, blue, emerald, amber, cyan, rose, green, indigo, purple, orange, pink, teal

Use OPEN-ENDED placeholders that ask questions, don't give answers.`

  try {
    const response = await chatComplete(MODELS.gpt4oMini, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Topic: ${topic}\n\nConcepts:\n${concepts.map((c: any) => `- ${c.title}: ${c.explanation}`).join('\n')}` }
    ])

    return JSON.parse(response)
  } catch {
    return {
      fields: [
        { id: 'goals', title: 'Goals & Objectives', subtitle: 'What do you want to achieve?', icon: 'Target', color: 'violet', placeholder: 'What specific goals do you want to accomplish?' },
        { id: 'dailyPractices', title: 'Daily Practices', subtitle: 'What will you do each day?', icon: 'Clock', color: 'blue', placeholder: 'What small actions will you take daily?' },
        { id: 'weeklyActions', title: 'Weekly Actions', subtitle: 'What bigger steps this week?', icon: 'Calendar', color: 'emerald', placeholder: 'What meaningful actions will you take this week?' },
        { id: 'milestones', title: 'Monthly Milestones', subtitle: 'What will you have accomplished?', icon: 'TrendingUp', color: 'amber', placeholder: 'What significant achievements will mark your progress?' }
      ]
    }
  }
}

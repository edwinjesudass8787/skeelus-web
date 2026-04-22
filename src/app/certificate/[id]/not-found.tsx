import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json(
    { error: 'Certificate not found' },
    { status: 404 }
  )
}
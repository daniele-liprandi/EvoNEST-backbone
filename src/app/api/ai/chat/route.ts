import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { get_database_user } from '@/app/api/utils/get_database_user'

const MASTRA_URL = process.env.MASTRA_URL ?? 'http://localhost:4111'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { message, threadId } = body

  if (!message || !threadId) {
    return NextResponse.json({ error: 'message and threadId are required' }, { status: 400 })
  }

  let dbName: string
  try {
    dbName = await get_database_user()
  } catch {
    return NextResponse.json({ error: 'Could not resolve user database' }, { status: 500 })
  }

  try {
    const mastraRes = await fetch(`${MASTRA_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, threadId, dbName }),
    })
    const data = await mastraRes.json()
    return NextResponse.json(data, { status: mastraRes.ok ? 200 : 502 })
  } catch {
    return NextResponse.json({
      blocks: [{ type: 'text', content: 'Could not reach the AI service. Please try again.' }],
    }, { status: 200 })
  }
}
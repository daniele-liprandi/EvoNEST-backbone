import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { getDb } from '../db/client.js'

const baseUrl = process.env.NEXTJS_BASE_URL ?? 'http://node:3000'

const EXCLUDE_FIELDS = new Set([
  '_id',
  'logbook',
  'recentChangeDate',
  '__v',
  'parentId',
  'responsible',
  'sampleId',
  'animalId',
  'fileId',
  'filesId',
  'data',
  'image',
])

const COMPUTED = {
  samples: ['responsibleName', 'parentName'],
  traits: ['responsibleName', 'sampleName', 'animalName'],
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

async function liveColumns(dbName: string, collectionName: 'samples' | 'traits'): Promise<string[]> {
  const db = await getDb(dbName)
  const docs = await db.collection(collectionName).find({}).limit(30).toArray()
  const keys = new Set<string>()

  for (const doc of docs) {
    for (const key of Object.keys(doc)) {
      if (!EXCLUDE_FIELDS.has(key)) {
        keys.add(key)
      }
    }
  }

  const computed = collectionName === 'samples' ? COMPUTED.samples : COMPUTED.traits
  return unique([...Array.from(keys), ...computed])
}

export const nlFilter = createTool({
  id: 'nlFilter',
  description: 'Use the same NL filter API used by the UI to convert natural-language queries into deterministic URL-style filter params.',
  inputSchema: z.object({
    query: z.string().min(1).describe('Natural-language filter query'),
    target: z.enum(['samples', 'traits']).describe('Entity to filter'),
    dbName: z.string().describe('The user database name (provided in system context)'),
  }),
  outputSchema: z.object({
    params: z.record(z.string(), z.string()),
    columnsUsed: z.array(z.string()),
    target: z.enum(['samples', 'traits']),
  }),
  execute: async ({ query, target, dbName }) => {
    console.log(`[nlFilter] query="${query}" target=${target} dbName=${dbName}`)
    const collectionName = target === 'samples' ? 'samples' : 'traits'
    const columns = await liveColumns(dbName, collectionName)
    console.log(`[nlFilter] columns (${columns.length}):`, columns.join(', '))

    const res = await fetch(`${baseUrl}/api/nlfilter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, columns }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`nlFilter API error ${res.status}: ${text.slice(0, 200)}`)
    }

    const data = await res.json()
    if (!data?.params || typeof data.params !== 'object') {
      throw new Error(`nlFilter returned invalid payload: ${JSON.stringify(data).slice(0, 200)}`)
    }

    const params: Record<string, string> = {}
    for (const [key, value] of Object.entries(data.params)) {
      if (typeof value === 'string') {
        params[key] = value
      }
    }

    console.log('[nlFilter] params:', JSON.stringify(params))
    return { params, columnsUsed: columns, target }
  },
})

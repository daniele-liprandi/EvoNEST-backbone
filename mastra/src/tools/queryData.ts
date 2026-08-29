import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { getDb } from '../db/client.js'
import { serviceAuthHeader } from '../lib/serviceHeaders.js'
import { buildFilterUrl, buildMongoFilter, sanitizeFilterParams } from '../lib/filters.js'

const baseUrl = process.env.NEXTJS_BASE_URL ?? 'http://node:3000'

const EXCLUDE_FIELDS = new Set([
  '_id', 'logbook', 'recentChangeDate', '__v', 'parentId', 'responsible',
  'sampleId', 'animalId', 'fileId', 'filesId', 'data', 'image',
])

const COMPUTED = {
  samples: ['responsibleName', 'parentName'],
  traits: ['responsibleName', 'sampleName', 'animalName'],
}

async function liveColumns(dbName: string, collectionName: 'samples' | 'traits'): Promise<string[]> {
  const db = await getDb(dbName)
  const docs = await db.collection(collectionName).find({}).limit(30).toArray()
  const keys = new Set<string>()
  for (const doc of docs) {
    for (const key of Object.keys(doc)) {
      if (!EXCLUDE_FIELDS.has(key)) keys.add(key)
    }
  }
  const computed = COMPUTED[collectionName]
  return Array.from(new Set([...Array.from(keys), ...computed]))
}

async function getFilterParams(query: string, columns: string[]): Promise<Record<string, string>> {
  const res = await fetch(`${baseUrl}/api/nlfilter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...serviceAuthHeader() },
    body: JSON.stringify({ query, columns }),
  })
  if (!res.ok) {
    throw new Error(`nlFilter API error ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  const data = await res.json()
  if (!data?.params || typeof data.params !== 'object') {
    throw new Error(`nlFilter returned invalid payload: ${JSON.stringify(data).slice(0, 200)}`)
  }
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(data.params)) {
    if (typeof value === 'string') params[key] = value
  }
  return params
}

export const queryData = createTool({
  id: 'queryData',
  description: 'Find samples or traits matching a natural-language description. Converts the description to deterministic filter params, then queries the database. Use for any data lookup.',
  inputSchema: z.object({
    query: z.string().min(1).describe('Natural-language description of what to find (e.g. "animal samples starting with p", "silk from Berlin", "all samples")'),
    target: z.enum(['samples', 'traits']).describe('Which entity to query'),
    dbName: z.string().describe('The user database name (provided in system context)'),
  }),
  outputSchema: z.object({
    data: z.array(z.record(z.string(), z.any())),
    totalCount: z.number(),
    filterUrl: z.string(),
    params: z.record(z.string(), z.string()),
    entity: z.enum(['samples', 'traits']),
  }),
  execute: async ({ query, target, dbName }) => {
    console.log(`[queryData] query="${query}" target=${target} dbName=${dbName}`)
    const collectionName = target === 'samples' ? 'samples' : 'traits'

    const columns = await liveColumns(dbName, collectionName)
    console.log(`[queryData] columns (${columns.length}):`, columns.join(', '))

    const rawParams = await getFilterParams(query, columns)
    const { params, rejected } = sanitizeFilterParams(rawParams, columns)
    if (rejected.length) {
      console.warn('[queryData] rejected filter keys:', rejected.join(', '))
    }
    console.log('[queryData] params:', JSON.stringify(params))

    const db = await getDb(dbName)
    const collection = db.collection(collectionName)
    const mongoFilter = buildMongoFilter(params)
    const [docs, totalCount] = await Promise.all([
      collection.find(mongoFilter).limit(50).toArray(),
      collection.countDocuments(mongoFilter),
    ])

    const data = docs.map((doc) => ({
      ...doc,
      _id: doc._id?.toString(),
      ...(collectionName === 'samples' && doc.date instanceof Date
        ? { date: doc.date.toISOString().slice(0, 10) }
        : {}),
    }))

    const filterUrl = buildFilterUrl(target, params)
    console.log('[queryData] totalCount:', totalCount, 'filterUrl:', filterUrl)
    return { data, totalCount, filterUrl, params, entity: target }
  },
})

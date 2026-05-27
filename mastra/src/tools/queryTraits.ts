import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { getDb } from '../db/client.js'
import { buildFilterUrl } from './querySamples.js'

const FiltersSchema = z.record(z.string(), z.string()).describe(
  'Field filters. Supports *, comma-separated OR, and _gte/_lte date suffixes.'
)

function buildMongoFilter(filters: Record<string, string>): Record<string, any> {
  const mongo: Record<string, any> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue
    if (key.endsWith('_gte')) {
      const field = key.slice(0, -4)
      mongo[field] = { ...mongo[field], $gte: new Date(value) }
    } else if (key.endsWith('_lte')) {
      const field = key.slice(0, -4)
      mongo[field] = { ...mongo[field], $lte: new Date(value) }
    } else if (value.includes('*')) {
      const pattern = '^' + value
        .split('*')
        .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*') + '$'
      mongo[key] = { $regex: new RegExp(pattern, 'i') }
    } else if (value.includes(',')) {
      mongo[key] = { $in: value.split(',').map((v) => v.trim()).filter(Boolean) }
    } else {
      mongo[key] = value
    }
  }
  return mongo
}

export const queryTraits = createTool({
  id: 'queryTraits',
  description: 'Query the traits collection. Returns up to 50 matching records and the total count.',
  inputSchema: z.object({
    filters: FiltersSchema.default({}),
    dbName: z.string().describe('The user database name'),
  }),
  outputSchema: z.object({
    data: z.array(z.record(z.string(), z.any())),
    totalCount: z.number(),
    filterUrl: z.string(),
  }),
  execute: async ({ filters = {}, dbName }) => {
    const db = await getDb(dbName)
    const collection = db.collection('traits')
    const mongoFilter = buildMongoFilter(filters)
    const [data, totalCount] = await Promise.all([
      collection.find(mongoFilter).limit(50).toArray(),
      collection.countDocuments(mongoFilter),
    ])
    const serialized = data.map((doc) => ({
      ...doc,
      _id: doc._id?.toString(),
    }))
    return { data: serialized, totalCount, filterUrl: buildFilterUrl('traits', filters) }
  },
})
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { getDb } from '../db/client.js'
import { buildMongoFilter, sanitizeFilterParams } from '../lib/filters.js'

const MAX_DOCS = 20000
const MAX_NODES = 2000

export const generateTreemap = createTool({
  id: 'generateTreemap',
  description: 'Build a Plotly treemap of samples or traits grouped by taxonomic or categorical hierarchy.',
  inputSchema: z.object({
    entity: z.enum(['samples', 'traits']).default('samples'),
    hierarchy: z.array(z.string()).default(['family', 'genus', 'species'])
      .describe('Ordered list of fields to group by, outermost first'),
    dbName: z.string(),
    filters: z.record(z.string(), z.string()).default({}),
  }),
  outputSchema: z.object({
    ids: z.array(z.string()),
    labels: z.array(z.string()),
    parents: z.array(z.string()),
    values: z.array(z.number()),
    title: z.string(),
  }),
  execute: async ({ entity = 'samples', hierarchy = ['family', 'genus', 'species'], dbName, filters = {} }) => {
    const db = await getDb(dbName)
    const { params: safeFilters, rejected } = sanitizeFilterParams(filters)
    if (rejected.length) {
      console.warn('[generateTreemap] rejected filter keys:', rejected.join(', '))
    }

    // Only the grouping fields are needed, and a large collection would
    // otherwise be pulled into memory in full.
    const projection = Object.fromEntries(hierarchy.map((f) => [f, 1]))
    const docs = await db.collection(entity)
      .find(buildMongoFilter(safeFilters), { projection })
      .limit(MAX_DOCS + 1)
      .toArray()
    const truncatedDocs = docs.length > MAX_DOCS
    if (truncatedDocs) docs.length = MAX_DOCS

    const count = new Map<string, number>()
    const label = new Map<string, string>()
    const parent = new Map<string, string>()
    const order: string[] = []

    for (const doc of docs) {
      let parentId = ''
      for (const field of hierarchy) {
        const val = String(doc[field] ?? '(unknown)')
        const id = parentId ? `${parentId}/${field}:${val}` : `${field}:${val}`
        if (!count.has(id)) {
          order.push(id)
          label.set(id, val)
          parent.set(id, parentId)
        }
        count.set(id, (count.get(id) ?? 0) + 1)
        parentId = id
      }
    }

    const truncatedNodes = order.length > MAX_NODES
    const kept = truncatedNodes ? order.slice(0, MAX_NODES) : order

    const note = truncatedDocs
      ? ` (first ${MAX_DOCS} records)`
      : truncatedNodes
        ? ` (first ${MAX_NODES} groups)`
        : ''

    return {
      ids: kept,
      labels: kept.map((id) => label.get(id) as string),
      parents: kept.map((id) => parent.get(id) as string),
      values: kept.map((id) => count.get(id) as number),
      title: `${entity} by ${hierarchy.join(' > ')}${note}`,
    }
  },
})
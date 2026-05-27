import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { getDb } from '../db/client'

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
    const docs = await db.collection(entity).find(filters as any).toArray()

    const counts = new Map<string, number>()
    for (const doc of docs) {
      let parentId = ''
      for (let i = 0; i < hierarchy.length; i++) {
        const field = hierarchy[i]
        const val = doc[field] ?? '(unknown)'
        const id = parentId ? `${parentId}/${field}:${val}` : `${field}:${val}`
        counts.set(id, (counts.get(id) ?? 0) + 1)
        parentId = id
      }
    }

    const seen = new Set<string>()
    const ids: string[] = []
    const labels: string[] = []
    const parents: string[] = []
    const values: number[] = []

    for (const doc of docs) {
      let parentId = ''
      for (let i = 0; i < hierarchy.length; i++) {
        const field = hierarchy[i]
        const val = doc[field] ?? '(unknown)'
        const id = parentId ? `${parentId}/${field}:${val}` : `${field}:${val}`
        if (!seen.has(id)) {
          seen.add(id)
          ids.push(id)
          labels.push(String(val))
          parents.push(parentId)
          values.push(counts.get(id) ?? 0)
        }
        parentId = id
      }
    }

    return {
      ids,
      labels,
      parents,
      values,
      title: `${entity} by ${hierarchy.join(' > ')}`,
    }
  },
})
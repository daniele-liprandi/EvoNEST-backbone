import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const baseUrl = process.env.NEXTJS_BASE_URL ?? 'http://node:3000'

export const getSchema = createTool({
  id: 'getSchema',
  description: 'Fetch the live filterable column names for each entity type. Call this at the start of a new conversation to understand what fields are available.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    routes: z.array(z.object({
      label: z.string(),
      path: z.string(),
      columns: z.array(z.string()),
    })),
  }),
  execute: async () => {
    const res = await fetch(`${baseUrl}/api/schema`)
    if (!res.ok) throw new Error(`Schema fetch failed: ${res.status}`)
    return res.json()
  },
})
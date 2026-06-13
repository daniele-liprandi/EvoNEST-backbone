import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { serviceAuthHeader } from '../lib/serviceHeaders.js'

const baseUrl = process.env.NEXTJS_BASE_URL ?? 'http://node:3000'

export const getSchema = createTool({
  id: 'getSchema',
  description: 'Fetch live filterable column names for each entity type for a specific user database.',
  inputSchema: z.object({
    dbName: z.string().describe('The user database name (provided in system context)'),
  }),
  outputSchema: z.object({
    routes: z.array(z.object({
      label: z.string(),
      path: z.string(),
      columns: z.array(z.string()),
    })),
  }),
  execute: async ({ dbName }) => {
    const res = await fetch(`${baseUrl}/api/schema?dbName=${encodeURIComponent(dbName)}`, {
      headers: serviceAuthHeader(),
    })
    if (!res.ok) {
      throw new Error(`schema API error ${res.status}: ${(await res.text()).slice(0, 200)}`)
    }
    const data = await res.json()
    if (!Array.isArray(data?.routes)) {
      throw new Error(`schema API returned invalid payload: ${JSON.stringify(data).slice(0, 200)}`)
    }
    return { routes: data.routes }
  },
})

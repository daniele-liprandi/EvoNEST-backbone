import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { fetchLabSchema } from '../lib/labSchema.js'

export const getSchema = createTool({
  id: 'getSchema',
  description:
    "Fetch this lab's record model: the filterable columns per section, and the configured sample types, trait types and subsample types (with the fields each sample type uses). Call before creating records so you use the lab's real types and fields.",
  inputSchema: z.object({
    dbName: z.string().describe('The user database name (provided in system context)'),
  }),
  outputSchema: z.object({
    routes: z.array(
      z.object({
        label: z.string(),
        path: z.string(),
        columns: z.array(z.string()),
      }),
    ),
    sampleTypes: z.array(
      z.object({ value: z.string(), label: z.string(), fields: z.array(z.string()) }),
    ),
    traitTypes: z.array(
      z.object({ value: z.string(), label: z.string(), unit: z.string().nullable() }),
    ),
    subsampleTypes: z.array(z.object({ value: z.string(), label: z.string() })),
  }),
  execute: async ({ dbName }) => {
    const schema = await fetchLabSchema(dbName)
    return {
      routes: schema.routes,
      sampleTypes: schema.sampleTypes,
      traitTypes: schema.traitTypes,
      subsampleTypes: schema.subsampleTypes,
    }
  },
})

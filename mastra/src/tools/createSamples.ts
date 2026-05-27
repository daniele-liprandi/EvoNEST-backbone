import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const SampleRecordSchema = z.object({
  name: z.string().describe('Sample identifier, e.g. "Araatr1"'),
  type: z.enum(['animal', 'silk', 'subsample', 'plant', 'preserved', 'artificial']),
  genus: z.string().optional(),
  species: z.string().optional(),
  family: z.string().optional(),
  location: z.string().optional(),
  date: z.string().optional().describe('ISO date string YYYY-MM-DD'),
  sex: z.enum(['male', 'female', 'unknown']).optional(),
  box: z.string().optional(),
  slot: z.string().optional(),
  notes: z.string().optional(),
})

export const createSamples = createTool({
  id: 'createSamples',
  description: 'Validate and stage sample records for user confirmation. Does NOT write to the database.',
  inputSchema: z.object({
    records: z.array(SampleRecordSchema).min(1).describe('Proposed sample records to create'),
  }),
  outputSchema: z.object({
    records: z.array(SampleRecordSchema),
    warnings: z.array(z.string()),
  }),
  execute: async ({ records }) => {
    const warnings: string[] = []
    const stagedRecords = records.map((r) => {
      const rec = { ...r }
      if (rec.date && !rec.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parsed = new Date(rec.date)
        if (!Number.isNaN(parsed.getTime())) {
          rec.date = parsed.toISOString().slice(0, 10)
        } else {
          warnings.push(`Could not parse date "${rec.date}" for sample "${rec.name}" - left as-is.`)
        }
      }
      if (!rec.date) {
        rec.date = new Date().toISOString().slice(0, 10)
        warnings.push(`No date provided for sample "${rec.name}" - defaulted to today.`)
      }
      return rec
    })
    return { records: stagedRecords, warnings }
  },
})
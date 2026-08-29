import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const TraitRecordSchema = z.object({
  type: z.string().describe('Trait type, e.g. "diameter", "tensile_strength"'),
  measurement: z.number().describe('Numeric measurement value'),
  unit: z.string().optional().describe('Unit of measurement, e.g. "mm", "MPa"'),
  sampleName: z.string().describe('Name of the associated sample'),
  date: z.string().optional().describe('ISO date string YYYY-MM-DD'),
  detail: z.string().optional().describe('Subtype or detail, e.g. "dragline"'),
  nfibres: z.number().optional().describe('Number of fibres (for silk measurements)'),
  notes: z.string().optional(),
})

export const createTraits = createTool({
  id: 'createTraits',
  description: 'Validate and stage trait records for user confirmation. Does NOT write to the database.',
  inputSchema: z.object({
    records: z.array(TraitRecordSchema).min(1).describe('Proposed trait records to create'),
  }),
  outputSchema: z.object({
    records: z.array(TraitRecordSchema),
    warnings: z.array(z.string()),
  }),
  execute: async ({ records }) => {
    const warnings: string[] = []
    const stagedRecords = records.map((r: z.infer<typeof TraitRecordSchema>) => {
      const rec = { ...r }
      if (rec.date && !rec.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parsed = new Date(rec.date)
        if (!Number.isNaN(parsed.getTime())) {
          rec.date = parsed.toISOString().slice(0, 10)
        } else {
          warnings.push(`Could not parse date "${rec.date}" for trait of sample "${rec.sampleName}".`)
        }
      }
      if (!rec.date) {
        rec.date = new Date().toISOString().slice(0, 10)
        warnings.push(`No date for trait of sample "${rec.sampleName}" - defaulted to today.`)
      }
      return rec
    })
    return { records: stagedRecords, warnings }
  },
})
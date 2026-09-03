import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { fetchLabSchema, type LabSchema } from '../lib/labSchema.js'

const TraitRecordSchema = z.object({
  type: z.string().describe('A trait type configured for this lab (getSchema.traitTypes)'),
  measurement: z.number().describe('Numeric measurement value'),
  unit: z.string().optional().describe('Unit of measurement, e.g. "mm", "MPa" — defaults to the type\'s configured unit'),
  sampleName: z.string().describe('Name of the associated sample'),
  date: z.string().optional().describe('ISO date string YYYY-MM-DD'),
  detail: z.string().optional().describe('Subtype or detail, e.g. "dragline"'),
  nfibres: z.number().optional().describe('Number of fibres (for silk measurements)'),
  notes: z.string().optional(),
})

type TraitRecord = z.infer<typeof TraitRecordSchema>

const normaliseDate = (rec: TraitRecord, warnings: string[]): TraitRecord => {
  const out = { ...rec }
  if (out.date && !out.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const parsed = new Date(out.date)
    if (!Number.isNaN(parsed.getTime())) {
      out.date = parsed.toISOString().slice(0, 10)
    } else {
      warnings.push(`Could not parse date "${out.date}" for trait of sample "${out.sampleName}".`)
    }
  }
  if (!out.date) {
    out.date = new Date().toISOString().slice(0, 10)
    warnings.push(`No date for trait of sample "${out.sampleName}" — defaulted to today.`)
  }
  return out
}

const normaliseToSchema = (rec: TraitRecord, schema: LabSchema, warnings: string[]): TraitRecord => {
  const configured = schema.traitTypes.find((t) => t.value === rec.type)
  if (schema.traitTypes.length > 0 && !configured) {
    warnings.push(
      `Trait type "${rec.type}" is not configured for this lab (${schema.traitTypes.map((t) => t.value).join(', ')}).`,
    )
  }
  if (!rec.unit && configured?.unit) {
    warnings.push(`No unit for a "${rec.type}" trait — using the configured unit "${configured.unit}".`)
    return { ...rec, unit: configured.unit }
  }
  return rec
}

export const createTraits = createTool({
  id: 'createTraits',
  description:
    "Validate and stage trait records for user confirmation. The trait `type` comes from this lab's config (call getSchema first); the unit defaults to the type's configured unit. Does NOT write to the database.",
  inputSchema: z.object({
    records: z.array(TraitRecordSchema).min(1).describe('Proposed trait records to create'),
    dbName: z.string().describe('The user database name'),
  }),
  outputSchema: z.object({
    records: z.array(TraitRecordSchema),
    warnings: z.array(z.string()),
  }),
  execute: async ({ records, dbName }) => {
    const warnings: string[] = []

    let schema: LabSchema
    try {
      schema = await fetchLabSchema(dbName)
    } catch {
      schema = { routes: [], sampleTypes: [], traitTypes: [], subsampleTypes: [] }
    }

    const stagedRecords = records.map((r) => normaliseToSchema(normaliseDate(r, warnings), schema, warnings))
    return { records: stagedRecords, warnings }
  },
})

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { Effect, Ref } from 'effect'
import { getDb } from '../db/client.js'

const baseUrl = process.env.NEXTJS_BASE_URL ?? 'http://node:3000'
const TAXONOMY_TIMEOUT_MS = 10000

const SampleRecordInputSchema = z.object({
  name: z.string().optional().describe('Sample identifier — auto-generated from genus+species if omitted'),
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

const SampleRecordOutputSchema = SampleRecordInputSchema.extend({
  name: z.string(),
})

type RecordInput = z.infer<typeof SampleRecordInputSchema>
type RecordOutput = z.infer<typeof SampleRecordOutputSchema>

interface TaxInfo {
  genus?: string
  species?: string
  family?: string
}

// ─── Name generation ──────────────────────────────────────────────────────────

const DEFAULT_COMBINATIONS: [number, number][] = [[3, 3], [3, 4], [3, 5], [4, 3], [4, 4], [5, 3], [5, 4], [4, 5]]

async function generateSampleName(
  genus: string,
  species: string,
  type: string,
  dbName: string,
  reservedInBatch: Set<string>,
): Promise<string> {
  const db = await getDb(dbName)
  const settings = await db.collection('settings').findOne({ type: 'main' })
  const idGen = settings?.idGeneration ?? {}
  const combinations: [number, number][] = idGen.combinations ?? DEFAULT_COMBINATIONS
  const startingNumber: number = idGen.startingNumber ?? 1
  const numberPadding: number = idGen.numberPadding ?? 0
  const useCollisionAvoidance: boolean = idGen.useCollisionAvoidance ?? true

  const g = genus.toLowerCase()
  const s = species.toLowerCase()
  let baseId = g.slice(0, 3) + s.slice(0, 3)

  for (const [gl, sl] of combinations) {
    const candidate = g.slice(0, gl) + s.slice(0, sl)
    if (useCollisionAvoidance) {
      const collision = await db.collection('samples').findOne({
        type,
        genus: { $ne: genus },
        name: { $regex: new RegExp(`^${candidate}\\d*$`, 'i') },
      })
      if (!collision) { baseId = candidate; break }
    } else {
      baseId = candidate; break
    }
  }

  const formatNum = (n: number) =>
    numberPadding > 0 ? String(n).padStart(numberPadding, '0') : String(n)

  const existing = await db.collection('samples')
    .find({ name: { $regex: new RegExp(`^${baseId}`, 'i') } })
    .project({ name: 1 })
    .toArray()
  const taken = new Set([
    ...existing.map((doc: any) => (doc.name as string).toLowerCase()),
    ...Array.from(reservedInBatch).map(n => n.toLowerCase()),
  ])

  let n = startingNumber
  while (taken.has((baseId + formatNum(n)).toLowerCase())) n++
  return baseId + formatNum(n)
}

const genName = (
  genus: string,
  species: string,
  type: string,
  dbName: string,
  reserved: Set<string>,
): Effect.Effect<string, never> =>
  Effect.tryPromise({
    try: () => generateSampleName(genus, species, type, dbName, reserved),
    catch: () => new Error('name generation failed'),
  }).pipe(
    Effect.orElse(() =>
      Effect.succeed(
        `${genus.slice(0, 3).toLowerCase()}${species.slice(0, 3).toLowerCase()}${Date.now().toString().slice(-4)}`,
      ),
    ),
  )

// ─── Taxonomy check ───────────────────────────────────────────────────────────

const fetchTaxonomy = (taxa: string, family: string | undefined): Effect.Effect<TaxInfo | null, never> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TAXONOMY_TIMEOUT_MS)

  return Effect.tryPromise({
    try: async (): Promise<TaxInfo | null> => {
      try {
        const response = await fetch(`${baseUrl}/api/checknames`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taxa, method: 'fullTaxaInfo', source: 'GNames', family }),
          signal: controller.signal,
        })
        if (!response.ok) return null
        const data = await response.json()
        if (data?.status !== 'success' || !data.data) return null
        const ti = data.data as Record<string, unknown>
        return {
          genus: typeof ti.genus === 'string' && ti.genus ? ti.genus : undefined,
          species: typeof ti.species === 'string' && ti.species ? ti.species : undefined,
          family: typeof ti.family === 'string' && ti.family ? ti.family : undefined,
        }
      } finally {
        clearTimeout(timeout)
      }
    },
    catch: () => new Error('taxonomy fetch failed'),
  }).pipe(Effect.orElse(() => Effect.succeed<TaxInfo | null>(null)))
}

// ─── Single record processing ─────────────────────────────────────────────────

const processRecord = (
  r: RecordInput,
  index: number,
  dbName: string,
  reservedRef: Ref.Ref<Set<string>>,
  warningsRef: Ref.Ref<string[]>,
): Effect.Effect<RecordOutput, never> =>
  Effect.gen(function* () {
    const rec: RecordOutput = { ...r, name: r.name ?? '' }

    // Date normalisation
    if (rec.date && !rec.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parsed = new Date(rec.date)
      if (!Number.isNaN(parsed.getTime())) {
        rec.date = parsed.toISOString().slice(0, 10)
      } else {
        yield* Ref.update(warningsRef, ws => [
          ...ws, `Could not parse date "${rec.date}" for record ${index + 1} — left as-is.`,
        ])
      }
    }
    if (!rec.date) {
      rec.date = new Date().toISOString().slice(0, 10)
      yield* Ref.update(warningsRef, ws => [
        ...ws, `No date for record ${index + 1} — defaulted to today.`,
      ])
    }

    // Taxonomy verification (silent on network failure; only warn on name correction)
    if (rec.genus) {
      const taxa = rec.species ? `${rec.genus} ${rec.species}` : rec.genus
      const taxInfo = yield* fetchTaxonomy(taxa, rec.family)

      if (taxInfo) {
        const changed =
          (taxInfo.genus && taxInfo.genus !== rec.genus) ||
          (taxInfo.species && taxInfo.species !== rec.species)
        if (taxInfo.family) rec.family = taxInfo.family
        if (taxInfo.genus) rec.genus = taxInfo.genus
        if (taxInfo.species) rec.species = taxInfo.species
        if (changed) {
          yield* Ref.update(warningsRef, ws => [
            ...ws, `Taxonomy corrected for "${taxa}": accepted as "${rec.genus} ${rec.species}".`,
          ])
        }
      }
      // No warning on network failure — the name may still be valid
    }

    // Name generation (sequential via concurrency:1 — reservedRef prevents batch duplicates)
    if (!rec.name) {
      if (rec.genus && rec.species) {
        const reserved = yield* Ref.get(reservedRef)
        const name = yield* genName(rec.genus, rec.species, rec.type, dbName, reserved)
        rec.name = name
        yield* Ref.update(reservedRef, s => new Set([...s, name]))
      } else {
        rec.name = `sample-${index + 1}`
        yield* Ref.update(warningsRef, ws => [
          ...ws,
          `No genus/species for record ${index + 1} — assigned placeholder name "${rec.name}". Please rename.`,
        ])
      }
    }

    return rec
  })

// ─── Tool ─────────────────────────────────────────────────────────────────────

export const createSamples = createTool({
  id: 'createSamples',
  description: 'Validate and stage sample records for user confirmation. Handles taxonomy verification and name auto-generation internally. Does NOT write to the database.',
  inputSchema: z.object({
    records: z.array(SampleRecordInputSchema).min(1).describe('Proposed sample records to create. Omit name — it will be generated automatically.'),
    dbName: z.string().describe('The user database name, required for name generation'),
  }),
  outputSchema: z.object({
    records: z.array(SampleRecordOutputSchema),
    warnings: z.array(z.string()),
  }),
  execute: ({ records, dbName }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const warningsRef = yield* Ref.make<string[]>([])
        const reservedRef = yield* Ref.make<Set<string>>(new Set())

        const stagedRecords = yield* Effect.forEach(
          records,
          (r, index) => processRecord(r, index, dbName, reservedRef, warningsRef),
          { concurrency: 1 },
        )

        const warnings = yield* Ref.get(warningsRef)
        return { records: stagedRecords, warnings }
      }),
    ),
})

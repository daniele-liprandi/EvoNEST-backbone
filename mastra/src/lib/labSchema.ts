import { serviceAuthHeader } from './serviceHeaders.js'

const baseUrl = process.env.NEXTJS_BASE_URL ?? 'http://node:3000'
const CACHE_TTL_MS = 60_000

export interface SampleTypeConfig {
  value: string
  label: string
  fields: string[]
}
export interface TraitTypeConfig {
  value: string
  label: string
  unit: string | null
}
export interface SubsampleTypeConfig {
  value: string
  label: string
}

export interface LabSchema {
  routes: Array<{ label: string; path: string; columns: string[] }>
  sampleTypes: SampleTypeConfig[]
  traitTypes: TraitTypeConfig[]
  subsampleTypes: SubsampleTypeConfig[]
}

const cache = new Map<string, { data: LabSchema; at: number }>()

/** The lab's configured record model, from GET /api/schema. Cached per database for a minute. */
export async function fetchLabSchema(dbName: string): Promise<LabSchema> {
  const hit = cache.get(dbName)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data

  const res = await fetch(`${baseUrl}/api/schema?dbName=${encodeURIComponent(dbName)}`, {
    headers: serviceAuthHeader(),
  })
  if (!res.ok) {
    throw new Error(`schema API error ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  const data = (await res.json()) as Partial<LabSchema>
  const schema: LabSchema = {
    routes: Array.isArray(data.routes) ? data.routes : [],
    sampleTypes: Array.isArray(data.sampleTypes) ? data.sampleTypes : [],
    traitTypes: Array.isArray(data.traitTypes) ? data.traitTypes : [],
    subsampleTypes: Array.isArray(data.subsampleTypes) ? data.subsampleTypes : [],
  }
  cache.set(dbName, { data: schema, at: Date.now() })
  return schema
}

/** For tests. */
export function clearLabSchemaCache(): void {
  cache.clear()
}

// Meta-field names in a sample type's `fields` config that stand for real columns.
const FIELD_EXPANSIONS: Record<string, string[]> = {
  taxonomy: ['genus', 'species', 'family', 'nomenclature'],
  parent: ['parentId', 'parentName', 'parent'],
}
// Columns every sample carries regardless of type.
const CORE_SAMPLE_FIELDS = [
  'name',
  'type',
  'date',
  'location',
  'lat',
  'lon',
  'notes',
  'box',
  'slot',
  'sex',
  'subsampletype',
]

/** Every field key a sample of `type` may carry: core columns + the type's configured fields (meta-fields expanded). */
export function allowedSampleFields(schema: LabSchema, type: string): Set<string> {
  const allowed = new Set(CORE_SAMPLE_FIELDS)
  const cfg = schema.sampleTypes.find((t) => t.value === type)
  for (const field of cfg?.fields ?? []) {
    for (const expanded of FIELD_EXPANSIONS[field] ?? [field]) allowed.add(expanded)
  }
  return allowed
}

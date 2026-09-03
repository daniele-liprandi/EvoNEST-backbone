import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSamples } from '../tools/createSamples.js'
import { createTraits } from '../tools/createTraits.js'
import { fetchLabSchema, allowedSampleFields, clearLabSchemaCache } from '../lib/labSchema.js'

const LAB_SCHEMA = {
  routes: [],
  sampleTypes: [
    { value: 'animal', label: 'Animal', fields: ['taxonomy', 'sex'] },
    { value: 'crop', label: 'Crop', fields: ['taxonomy', 'plot', 'treatment'] },
  ],
  traitTypes: [
    { value: 'mass', label: 'Mass', unit: 'g' },
    { value: 'count', label: 'Count', unit: null },
  ],
  subsampleTypes: [{ value: 'dragline', label: 'Dragline' }],
}

// Answer /api/schema; anything else (geocoding, checknames) is a soft failure.
const stubFetch = (schema: unknown = LAB_SCHEMA) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('/api/schema')) {
        return { ok: true, json: async () => schema } as Response
      }
      return { ok: false, status: 500, text: async () => 'not stubbed' } as Response
    }),
  )

beforeEach(() => {
  clearLabSchemaCache()
  vi.unstubAllGlobals()
  process.env.NEXTJS_BASE_URL = 'http://nest.test'
})

describe('fetchLabSchema', () => {
  it('parses the response and caches per database', async () => {
    stubFetch()
    const a = await fetchLabSchema('labdb')
    const b = await fetchLabSchema('labdb')
    expect(a.sampleTypes.map((t) => t.value)).toEqual(['animal', 'crop'])
    expect((global.fetch as any).mock.calls).toHaveLength(1) // cached
  })

  it('allowedSampleFields expands taxonomy and includes core columns', () => {
    const allowed = allowedSampleFields(LAB_SCHEMA, 'crop')
    expect(allowed.has('genus')).toBe(true) // from taxonomy
    expect(allowed.has('plot')).toBe(true) // configured
    expect(allowed.has('box')).toBe(true) // core
    expect(allowed.has('wingspan')).toBe(false)
  })
})

describe('createSamples', () => {
  it('accepts a configured non-silk type and moves stray keys into fields', async () => {
    stubFetch()
    const res: any = await (createSamples.execute as any)({
      records: [{ type: 'crop', plot: 'A3', treatment: 'N+', date: '2026-01-01' }],
      dbName: 'labdb',
    })
    const rec = res.records[0]
    expect(rec.type).toBe('crop')
    expect(rec.fields).toEqual({ plot: 'A3', treatment: 'N+' })
    expect(res.warnings).not.toContainEqual(expect.stringMatching(/not configured/))
  })

  it('warns about an unconfigured sample type and unknown fields', async () => {
    stubFetch()
    const res: any = await (createSamples.execute as any)({
      records: [{ type: 'mineral', date: '2026-01-01', fields: { hardness: 7 } }],
      dbName: 'labdb',
    })
    expect(res.warnings).toContainEqual(expect.stringMatching(/sample type "mineral" is not configured/))
    expect(res.warnings).toContainEqual(expect.stringMatching(/field "hardness" is not configured/))
  })

  it('falls back gracefully when the schema fetch fails (no type warnings)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, text: async () => 'down' }) as Response))
    const res: any = await (createSamples.execute as any)({
      records: [{ type: 'whatever', date: '2026-01-01' }],
      dbName: 'labdb',
    })
    expect(res.warnings).not.toContainEqual(expect.stringMatching(/not configured/))
    expect(res.records[0].type).toBe('whatever')
  })
})

describe('createTraits', () => {
  it('fills the unit from the configured trait type when omitted', async () => {
    stubFetch()
    const res: any = await (createTraits.execute as any)({
      records: [{ type: 'mass', measurement: 5, sampleName: 'Ara1', date: '2026-01-01' }],
      dbName: 'labdb',
    })
    expect(res.records[0].unit).toBe('g')
    expect(res.warnings).toContainEqual(expect.stringMatching(/using the configured unit "g"/))
  })

  it('warns about an unconfigured trait type', async () => {
    stubFetch()
    const res: any = await (createTraits.execute as any)({
      records: [{ type: 'luminance', measurement: 1, sampleName: 'Ara1', date: '2026-01-01' }],
      dbName: 'labdb',
    })
    expect(res.warnings).toContainEqual(expect.stringMatching(/Trait type "luminance" is not configured/))
  })
})

import { describe, it, expect } from 'vitest'
import { sanitizeFilterParams, buildMongoFilter } from '../lib/filters.js'

describe('sanitizeFilterParams', () => {
  it('drops MongoDB operator keys', () => {
    const { params, rejected } = sanitizeFilterParams({
      $where: 'sleep(5000)',
      genus: 'Araneus',
    })
    expect(params).toEqual({ genus: 'Araneus' })
    expect(rejected).toContain('$where')
  })

  it('drops dotted paths', () => {
    const { params, rejected } = sanitizeFilterParams({ 'a.b': 'x', name: 'y' })
    expect(params).toEqual({ name: 'y' })
    expect(rejected).toContain('a.b')
  })

  it('keeps a key only when it matches an allowed column', () => {
    const { params, rejected } = sanitizeFilterParams(
      { genus: 'Araneus', password: 'secret' },
      ['genus', 'species'],
    )
    expect(params).toEqual({ genus: 'Araneus' })
    expect(rejected).toContain('password')
  })

  it('validates the base field of a range key against the column list', () => {
    const { params } = sanitizeFilterParams(
      { date_gte: '2026-01-01', evil_gte: '1' },
      ['date'],
    )
    expect(params).toEqual({ date_gte: '2026-01-01' })
  })
})

describe('buildMongoFilter', () => {
  it('keeps a plain equality', () => {
    expect(buildMongoFilter({ type: 'silk' })).toEqual({ type: 'silk' })
  })

  it('turns a comma list into $in', () => {
    expect(buildMongoFilter({ type: 'silk,animal' })).toEqual({
      type: { $in: ['silk', 'animal'] },
    })
  })

  it('anchors a wildcard and escapes regex metacharacters', () => {
    const filter = buildMongoFilter({ name: 'Ara*' }) as { name: { $regex: RegExp } }
    expect(filter.name.$regex).toBeInstanceOf(RegExp)
    expect(filter.name.$regex.source).toBe('^Ara.*$')
  })
})

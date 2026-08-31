import { describe, it, expect } from 'vitest'
import { findCreateToolResult, findQueryToolResult, findTreemapToolResult } from '../lib/toolResults.js'

const queryPayload = {
  data: [{ name: 'Araatr1' }],
  totalCount: 1,
  filterUrl: '/samples/general?type=silk',
  entity: 'samples' as const,
}

const createPayload = {
  records: [{ name: 'Araatr1', type: 'silk' }],
  warnings: ['No date for record 1 — defaulted to today.'],
}

describe('findQueryToolResult', () => {
  it('reads a top-level toolResults chunk', () => {
    const r = { toolResults: [{ payload: { toolName: 'queryData', result: queryPayload } }] }
    expect(findQueryToolResult(r)?.totalCount).toBe(1)
  })

  it('reads a steps[].toolResults chunk', () => {
    const r = { steps: [{ toolResults: [{ toolName: 'queryData', result: queryPayload }] }] }
    expect(findQueryToolResult(r)?.filterUrl).toBe(queryPayload.filterUrl)
  })

  it('reads a role:tool response message', () => {
    const r = {
      response: {
        messages: [
          { role: 'tool', content: [{ type: 'tool-result', toolName: 'queryData', result: queryPayload }] },
        ],
      },
    }
    expect(findQueryToolResult(r)?.entity).toBe('samples')
  })

  it('reads a tool-invocation UI part', () => {
    const r = {
      response: {
        messages: [
          {
            content: {
              parts: [
                { type: 'tool-invocation', toolInvocation: { state: 'result', toolName: 'queryData', result: queryPayload } },
              ],
            },
          },
        ],
      },
    }
    expect(findQueryToolResult(r)?.data).toHaveLength(1)
  })

  it('ignores an unrelated tool and a malformed payload', () => {
    expect(findQueryToolResult({ toolResults: [{ toolName: 'getSchema', result: { routes: [] } }] })).toBeNull()
    expect(findQueryToolResult({ toolResults: [{ toolName: 'queryData', result: { data: [] } }] })).toBeNull()
    expect(findQueryToolResult({})).toBeNull()
  })
})

describe('findCreateToolResult', () => {
  it('reads each carrier shape', () => {
    expect(findCreateToolResult({ toolResults: [{ payload: { toolName: 'createSamples', result: createPayload } }] })?.records).toHaveLength(1)
    expect(findCreateToolResult({ steps: [{ toolResults: [{ toolName: 'createTraits', result: createPayload }] }] })?.toolName).toBe('createTraits')
    expect(findCreateToolResult({
      response: { messages: [{ role: 'tool', content: [{ type: 'tool-result', toolName: 'createSamples', result: createPayload }] }] },
    })?.warnings).toHaveLength(1)
  })

  it('defaults warnings to an empty array', () => {
    const r = { toolResults: [{ toolName: 'createSamples', result: { records: [{ name: 'x' }] } }] }
    expect(findCreateToolResult(r)?.warnings).toEqual([])
  })

  it('returns null when no create tool ran', () => {
    expect(findCreateToolResult({ toolResults: [{ toolName: 'queryData', result: queryPayload }] })).toBeNull()
  })
})

describe('findTreemapToolResult', () => {
  const treemapPayload = {
    ids: ['family:Araneidae', 'family:Araneidae/genus:Araneus'],
    labels: ['Araneidae', 'Araneus'],
    parents: ['', 'family:Araneidae'],
    values: [3, 2],
    title: 'samples by family > genus',
  }

  it('reads the treemap arrays from a step result', () => {
    const r = { steps: [{ toolResults: [{ toolName: 'generateTreemap', result: treemapPayload }] }] }
    expect(findTreemapToolResult(r)?.values).toEqual([3, 2])
  })

  it('ignores a query result', () => {
    expect(findTreemapToolResult({ toolResults: [{ toolName: 'queryData', result: queryPayload }] })).toBeNull()
  })
})

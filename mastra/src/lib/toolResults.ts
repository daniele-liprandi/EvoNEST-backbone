/**
 * Pull a specific tool's output out of a Mastra `agent.generate()` result.
 *
 * The result carries tool output in several shapes depending on the model
 * provider and the Mastra version, so every known location is walked in one
 * place. If a `@mastra/core` upgrade changes the shape, the tests in
 * toolResults.test.ts fail rather than the server silently returning no table.
 */

type Matcher<T> = (toolName: string, toolResult: any) => T | null

export function walkToolResults<T>(result: any, match: Matcher<T>): T | null {
  // 1. Top-level toolResults (Mastra ToolResultChunk)
  for (const tr of result?.toolResults ?? []) {
    const found = match(tr.payload?.toolName ?? tr.toolName, tr.payload?.result ?? tr.result)
    if (found) return found
  }

  // 2. steps[].toolResults (Vercel AI SDK step format)
  for (const step of result?.steps ?? []) {
    for (const tr of step.toolResults ?? []) {
      const found = match(tr.payload?.toolName ?? tr.toolName, tr.payload?.result ?? tr.result)
      if (found) return found
    }
  }

  // 3. response.messages[] with role 'tool' and tool-result parts (CoreToolMessage)
  for (const msg of result?.response?.messages ?? []) {
    if (msg.role === 'tool' && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'tool-result') {
          const found = match(part.toolName, part.result)
          if (found) return found
        }
      }
    }
  }

  // 4. response.messages[].content.parts[] tool-invocation (Mastra UI format)
  for (const msg of result?.response?.messages ?? []) {
    for (const part of msg?.content?.parts ?? []) {
      if (part?.type === 'tool-invocation' && part.toolInvocation?.state === 'result') {
        const found = match(part.toolInvocation.toolName, part.toolInvocation.result)
        if (found) return found
      }
    }
  }

  return null
}

export interface CreateToolResult {
  toolName: string
  records: any[]
  warnings: string[]
}

export function findCreateToolResult(result: any): CreateToolResult | null {
  return walkToolResults(result, (toolName, tr) => {
    if ((toolName === 'createSamples' || toolName === 'createTraits') && Array.isArray(tr?.records)) {
      return { toolName, records: tr.records as any[], warnings: (tr.warnings ?? []) as string[] }
    }
    return null
  })
}

export interface QueryToolResult {
  toolName: string
  entity: 'samples' | 'traits'
  data: any[]
  totalCount: number
  filterUrl: string
}

export function findQueryToolResult(result: any): QueryToolResult | null {
  return walkToolResults(result, (toolName, tr) => {
    if (
      toolName === 'queryData' &&
      Array.isArray(tr?.data) &&
      typeof tr?.totalCount === 'number' &&
      typeof tr?.filterUrl === 'string'
    ) {
      const entity: 'samples' | 'traits' = tr.entity ?? 'samples'
      return {
        toolName,
        entity,
        data: tr.data as any[],
        totalCount: tr.totalCount as number,
        filterUrl: tr.filterUrl as string,
      }
    }
    return null
  })
}

export interface TreemapToolResult {
  ids: string[]
  labels: string[]
  parents: string[]
  values: number[]
  title: string
}

export function findTreemapToolResult(result: any): TreemapToolResult | null {
  return walkToolResults(result, (toolName, tr) => {
    if (
      toolName === 'generateTreemap' &&
      Array.isArray(tr?.ids) &&
      Array.isArray(tr?.values) &&
      typeof tr?.title === 'string'
    ) {
      return {
        ids: tr.ids as string[],
        labels: tr.labels as string[],
        parents: tr.parents as string[],
        values: tr.values as number[],
        title: tr.title as string,
      }
    }
    return null
  })
}

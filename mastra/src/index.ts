import express from 'express'
import { evonestAgent } from './agent.js'
import { createAgent } from './agents/createAgent.js'
import { AgentResponseSchema } from './types.js'

const app = express()
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

function classifyIntent(message: string): 'create' | 'query' {
  return /\b(add|create|insert|submit|save|upload|collect|collected|record|recorded|log|logged|register|registered|stage)\b/i.test(message)
    ? 'create'
    : 'query'
}

function findCreateToolResult(result: any): { toolName: string; records: any[]; warnings: string[] } | null {
  const targets = ['createSamples', 'createTraits']

  function fromResult(toolName: string, toolResult: any) {
    if (targets.includes(toolName) && Array.isArray(toolResult?.records)) {
      return { toolName, records: toolResult.records, warnings: toolResult.warnings ?? [] }
    }
    return null
  }

  // 1. Mastra ToolResultChunk format: tr.payload.toolName / tr.payload.result
  for (const tr of result.toolResults ?? []) {
    const found = fromResult(tr.payload?.toolName ?? tr.toolName, tr.payload?.result ?? tr.result)
    if (found) return found
  }

  // 2. Mastra steps — each step has toolResults: ToolResultChunk[]
  for (const step of result.steps ?? []) {
    for (const tr of step.toolResults ?? []) {
      const found = fromResult(tr.payload?.toolName ?? tr.toolName, tr.payload?.result ?? tr.result)
      if (found) return found
    }
  }

  // 3. CoreToolMessage format (Vercel AI SDK response messages, role: 'tool')
  for (const msg of result.response?.messages ?? []) {
    if (msg.role === 'tool' && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'tool-result') {
          const found = fromResult(part.toolName, part.result)
          if (found) return found
        }
      }
    }
  }

  // 4. Mastra UI format — tool-invocation parts in assistant messages
  for (const msg of result.response?.messages ?? []) {
    for (const part of msg?.content?.parts ?? []) {
      if (part?.type === 'tool-invocation' && part.toolInvocation?.state === 'result') {
        const found = fromResult(part.toolInvocation.toolName, part.toolInvocation.result)
        if (found) return found
      }
    }
  }

  console.error('[findCreateToolResult] not found — result keys:', Object.keys(result),
    '| toolResults count:', result.toolResults?.length,
    '| steps count:', result.steps?.length,
    '| first toolResult sample:', JSON.stringify(result.toolResults?.[0])?.slice(0, 200))

  return null
}

app.post('/chat', async (req, res) => {
  const { message, threadId, dbName } = req.body as {
    message: string
    threadId: string
    dbName: string
  }

  if (!message || !threadId || !dbName) {
    return res.status(400).json({ error: 'message, threadId, and dbName are required' })
  }

  const contextualMessage = `[context: dbName="${dbName}"]\n\n${message}`
  const intent = classifyIntent(message)

  try {
    if (intent === 'create') {
      const result = await createAgent.generate(contextualMessage)
      const toolResult = findCreateToolResult(result)
      const summary = typeof result.text === 'string' ? result.text.trim() : ''

      const blocks: any[] = [
        { type: 'text', content: summary || 'Records staged for confirmation.' },
      ]

      if (toolResult && toolResult.records.length > 0) {
        if (toolResult.warnings.length > 0) {
          blocks.push({ type: 'text', content: toolResult.warnings.join('\n') })
        }
        blocks.push({
          type: 'readback',
          entity: toolResult.toolName === 'createSamples' ? 'samples' : 'traits',
          records: toolResult.records,
          pendingCreate: true,
        })
      } else {
        blocks[0].content = summary || 'Could not stage the records. Please check the details and try again.'
      }

      return res.json({ blocks })
    }

    // Query path: use structured output agent
    const result = await evonestAgent.generate(contextualMessage, {
      structuredOutput: { schema: AgentResponseSchema },
    })
    const parsed = AgentResponseSchema.parse(result.object)
    return res.json({ blocks: parsed.blocks })
  } catch (err: any) {
    console.error('Agent error:', err)
    return res.status(500).json({
      blocks: [{ type: 'text', content: 'Something went wrong. Please try again.' }],
    })
  }
})

const port = parseInt(process.env.PORT ?? '4111', 10)
app.listen(port, () => {
  console.log(`Mastra service listening on port ${port}`)
})

import express from 'express'
import { evonestAgent } from './agent.js'
import { findCreateToolResult, findQueryToolResult, findTreemapToolResult } from './lib/toolResults.js'

const app = express()
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

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

  try {
    // One agent owns both tool sets and decides query vs create. The response
    // block is built from whichever tool actually ran, never from the model text.
    // Memory is keyed by threadId (per browser session) and scoped to the database.
    const result = await evonestAgent.generate(contextualMessage, {
      memory: { thread: threadId, resource: dbName },
    })
    const summary = typeof result.text === 'string' ? result.text.trim() : ''

    const created = findCreateToolResult(result)
    if (created && created.records.length > 0) {
      const blocks: any[] = [{ type: 'text', content: summary || 'Records staged for confirmation.' }]
      if (created.warnings.length > 0) {
        blocks.push({ type: 'text', content: created.warnings.join('\n') })
      }
      blocks.push({
        type: 'readback',
        entity: created.toolName === 'createSamples' ? 'samples' : 'traits',
        records: created.records,
        pendingCreate: true,
      })
      return res.json({ blocks })
    }

    const treemap = findTreemapToolResult(result)
    if (treemap) {
      return res.json({
        blocks: [
          { type: 'text', content: summary || treemap.title },
          {
            type: 'chart',
            chartType: 'treemap',
            title: treemap.title,
            data: treemap.ids.map((id, i) => ({
              id,
              label: treemap.labels[i],
              parent: treemap.parents[i],
              value: treemap.values[i],
            })),
            config: { branchvalues: 'total' },
          },
        ],
      })
    }

    const query = findQueryToolResult(result)
    if (query) {
      return res.json({
        blocks: [
          { type: 'text', content: summary || `Found ${query.totalCount} matching records.` },
          {
            type: 'table',
            entity: query.entity,
            data: query.data,
            totalCount: query.totalCount,
            filterUrl: query.filterUrl,
          },
        ],
      })
    }

    console.warn('[chat] no recognised tool result — result keys:', Object.keys(result),
      '| steps:', result.steps?.length, '| toolResults:', result.toolResults?.length)
    return res.json({
      blocks: [{ type: 'text', content: summary || 'No results found.' }],
    })
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

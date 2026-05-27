import express from 'express'
import { evonestAgent } from './agent'
import { AgentResponseSchema } from './types'

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

  try {
    const contextualMessage = `[context: dbName="${dbName}"]\n\n${message}`

    const result = await evonestAgent.generate(contextualMessage)
    const raw = (result as any).object ?? JSON.parse((result as any).text ?? '{}')
    const parsed = AgentResponseSchema.parse(raw)

    return res.json({ blocks: parsed.blocks })
  } catch (err: any) {
    console.error('Agent error:', err)
    return res.status(500).json({
      blocks: [{
        type: 'text',
        content: 'Something went wrong. Please try again.',
      }],
    })
  }
})

const port = parseInt(process.env.PORT ?? '4111', 10)
app.listen(port, () => {
  console.log(`Mastra service listening on port ${port}`)
})
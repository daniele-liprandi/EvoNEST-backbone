import { describe, it, expect } from 'vitest'
import { memory } from '../memory.js'

// The agent wiring (evonestAgent.memory) and multi-turn recall are covered by
// the type checker and the eval suite; those need LLM credentials to run.
describe('conversation memory', () => {
  it('constructs a Memory instance backed by a store', () => {
    expect(memory.constructor.name).toBe('Memory')
    expect((memory as any).storage).toBeDefined()
  })

  it('persists and recalls messages for a thread', async () => {
    const threadId = 'test-thread-1'
    const resourceId = 'testdb'

    await memory.saveThread({
      thread: {
        id: threadId,
        resourceId,
        title: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      },
    })
    await memory.saveMessages({
      messages: [
        {
          id: 'm1',
          threadId,
          resourceId,
          role: 'user',
          content: { format: 2, parts: [{ type: 'text', text: 'show me the silk samples' }] },
          createdAt: new Date(),
        } as any,
      ],
    })

    const recalled = await memory.recall({ threadId, resourceId })
    expect(recalled.messages.length).toBeGreaterThan(0)
  })
})

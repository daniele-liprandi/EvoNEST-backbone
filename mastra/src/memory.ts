import { Memory } from '@mastra/memory'
import { InMemoryStore } from '@mastra/core/storage'

/**
 * Conversation memory for the agent.
 *
 * Threads are keyed by the client-generated threadId (per browser session) and
 * scoped to the researcher's database. The store is in-process: history is kept
 * while the service runs and lost on restart, which is enough for a single
 * research session. Swap InMemoryStore for a persistent adapter (LibSQLStore
 * with a mounted volume, or a Mongo adapter) if history needs to survive
 * restarts.
 */
export const memory = new Memory({
  storage: new InMemoryStore(),
  options: {
    lastMessages: 10,
  },
})

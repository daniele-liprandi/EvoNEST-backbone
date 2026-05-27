# EvoNEST Mastra AI Home Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static EvoNEST home page with a Mastra-powered conversational AI canvas that lets researchers query, visualise, and submit samples and traits using natural language.

**Architecture:** A separate Mastra Docker service runs a Claude-backed agent with MongoDB tools. The Next.js app proxies authenticated requests to it via `/api/ai/chat`. The agent returns typed `MessageBlock[]` packets; the frontend maps each block type to a React component. Existing data pages and their `NlFilterBar` are unchanged.

**Tech Stack:** Mastra (`@mastra/core`), Vercel AI SDK (`@ai-sdk/anthropic`), Express, MongoDB, Zod, React, Recharts, Plotly.js, next-auth, TanStack Table, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-05-27-mastra-home-ai-design.md`

---

## File Map

### New — Mastra service
| File | Purpose |
| --- | --- |
| `mastra/package.json` | Node package for Mastra service |
| `mastra/tsconfig.json` | TypeScript config |
| `mastra/Dockerfile` | Production image |
| `mastra/src/types.ts` | `MessageBlock` Zod schemas + TS types |
| `mastra/src/db/client.ts` | MongoDB connection for Mastra service |
| `mastra/src/tools/querySamples.ts` | Query samples collection |
| `mastra/src/tools/queryTraits.ts` | Query traits collection |
| `mastra/src/tools/createSamples.ts` | Stage sample records for readback |
| `mastra/src/tools/createTraits.ts` | Stage trait records for readback |
| `mastra/src/tools/checkTaxonomicName.ts` | Verify scientific name via existing API |
| `mastra/src/tools/generateTreemap.ts` | Build Plotly hierarchy data |
| `mastra/src/tools/getSchema.ts` | Fetch live filterable columns |
| `mastra/src/agent.ts` | Agent definition + system prompt |
| `mastra/src/index.ts` | Express HTTP server |

### New — Next.js
| File | Purpose |
| --- | --- |
| `src/lib/ai-types.ts` | Mirror of `mastra/src/types.ts` for frontend |
| `src/app/api/ai/chat/route.ts` | Auth proxy to Mastra |
| `src/components/nest/ai/CommandBar.tsx` | Text input + send button |
| `src/components/nest/ai/ConversationCanvas.tsx` | Scrollable message history + empty state map |
| `src/components/nest/ai/blocks/TextBlock.tsx` | Markdown text renderer |
| `src/components/nest/ai/blocks/TableBlock.tsx` | Data table with truncation + "View all" link |
| `src/components/nest/ai/blocks/ChartBlock.tsx` | Recharts/Plotly chart renderer |
| `src/components/nest/ai/blocks/ReadbackBlock.tsx` | Desktop table + mobile cards + confirm/fix |
| `src/__tests__/api/ai-chat-proxy.test.ts` | Auth check test for proxy route |
| `src/__tests__/components/ai/TableBlock.test.tsx` | Truncation + link generation test |
| `src/__tests__/components/ai/ReadbackBlock.test.tsx` | Desktop/mobile rendering test |

### Modified
| File | Change |
| --- | --- |
| `src/app/(nest)/home/page.tsx` | Full rewrite — canvas layout |
| `src/components/nest/navbar.tsx` | Add notification bell (DeveloperNewsCard) |
| `docker-compose.yml` | Add `mastra` service |
| `docker-compose.dev.yml` | Add `mastra` service for dev |

### Deleted
| File | Reason |
| --- | --- |
| `src/components/nest/NlGlobalSearchCard.tsx` | Superseded by Mastra canvas |

---

## Task 1: Shared types

**Files:**
- Create: `mastra/src/types.ts`
- Create: `src/lib/ai-types.ts` (identical content)

- [ ] **Step 1: Write `mastra/src/types.ts`**

```typescript
// mastra/src/types.ts
import { z } from 'zod'

export const TextBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string(),
})

export const TableBlockSchema = z.object({
  type: z.literal('table'),
  entity: z.enum(['samples', 'traits']),
  data: z.array(z.record(z.string(), z.any())),
  totalCount: z.number(),
  filterUrl: z.string(),
})

export const ChartBlockSchema = z.object({
  type: z.literal('chart'),
  chartType: z.enum(['bar', 'scatter', 'line', 'treemap']),
  title: z.string(),
  data: z.array(z.any()),
  config: z.record(z.string(), z.any()),
})

export const ReadbackBlockSchema = z.object({
  type: z.literal('readback'),
  entity: z.enum(['samples', 'traits']),
  records: z.array(z.record(z.string(), z.any())),
  pendingCreate: z.literal(true),
})

export const MessageBlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  TableBlockSchema,
  ChartBlockSchema,
  ReadbackBlockSchema,
])

export const AgentResponseSchema = z.object({
  blocks: z.array(MessageBlockSchema),
})

export type TextBlock = z.infer<typeof TextBlockSchema>
export type TableBlock = z.infer<typeof TableBlockSchema>
export type ChartBlock = z.infer<typeof ChartBlockSchema>
export type ReadbackBlock = z.infer<typeof ReadbackBlockSchema>
export type MessageBlock = z.infer<typeof MessageBlockSchema>
export type AgentResponse = z.infer<typeof AgentResponseSchema>
```

- [ ] **Step 2: Create `src/lib/ai-types.ts`** with the exact same content (copy the file — these are separate packages, no shared symlink needed for v1).

- [ ] **Step 3: Commit**

```bash
git add mastra/src/types.ts src/lib/ai-types.ts
git commit -m "feat: add shared MessageBlock types for Mastra AI canvas"
```

---

## Task 2: Mastra service scaffold + MongoDB client

**Files:**
- Create: `mastra/package.json`
- Create: `mastra/tsconfig.json`
- Create: `mastra/Dockerfile`
- Create: `mastra/src/db/client.ts`

- [ ] **Step 1: Write `mastra/package.json`**

Check npm for the latest stable versions of `@mastra/core` and `@ai-sdk/anthropic` before running install. The structure below uses `latest` as a placeholder — replace with pinned versions.

```json
{
  "name": "evonest-mastra",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --outDir dist",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@mastra/core": "latest",
    "@mastra/memory": "latest",
    "@ai-sdk/anthropic": "latest",
    "express": "^4.18.0",
    "mongodb": "^7.2.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0"
  }
}
```

- [ ] **Step 2: Write `mastra/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `mastra/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 4111
CMD ["node", "dist/index.js"]
```

- [ ] **Step 4: Write `mastra/src/db/client.ts`**

```typescript
// mastra/src/db/client.ts
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
if (!uri) throw new Error('MONGODB_URI is required')

let client: MongoClient | null = null

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client
  client = new MongoClient(uri!)
  await client.connect()
  return client
}

export async function getDb(dbName: string) {
  const c = await getMongoClient()
  return c.db(dbName)
}
```

- [ ] **Step 5: Run `npm install` inside `mastra/`**

```bash
cd mastra && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Commit**

```bash
git add mastra/
git commit -m "feat: scaffold Mastra service package"
```

---

## Task 3: querySamples tool

**Files:**
- Create: `mastra/src/tools/querySamples.ts`

- [ ] **Step 1: Write `mastra/src/tools/querySamples.ts`**

```typescript
// mastra/src/tools/querySamples.ts
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { getDb } from '../db/client'

const FiltersSchema = z.record(z.string(), z.string()).describe(
  'Field filters. Use * for wildcards (e.g. "Ara*"), comma-separate for OR (e.g. "silk,animal"), ' +
  'append _gte/_lte for date ranges (e.g. date_gte: "2024-01-01").'
)

function buildMongoFilter(filters: Record<string, string>): Record<string, any> {
  const mongo: Record<string, any> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue
    if (key.endsWith('_gte')) {
      const field = key.slice(0, -4)
      mongo[field] = { ...mongo[field], $gte: new Date(value) }
    } else if (key.endsWith('_lte')) {
      const field = key.slice(0, -4)
      mongo[field] = { ...mongo[field], $lte: new Date(value) }
    } else if (value.includes('*')) {
      const pattern = '^' + value
        .split('*')
        .map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*') + '$'
      mongo[key] = { $regex: new RegExp(pattern, 'i') }
    } else if (value.includes(',')) {
      mongo[key] = { $in: value.split(',').map(v => v.trim()).filter(Boolean) }
    } else {
      mongo[key] = value
    }
  }
  return mongo
}

export function buildFilterUrl(entity: 'samples' | 'traits', filters: Record<string, string>): string {
  const path = entity === 'samples' ? '/samples/general' : '/traits'
  const params = new URLSearchParams(filters).toString()
  return params ? `${path}?${params}` : path
}

export const querySamples = createTool({
  id: 'querySamples',
  description: 'Query the samples collection. Returns up to 50 matching records and the total count.',
  inputSchema: z.object({
    filters: FiltersSchema.default({}),
    dbName: z.string().describe('The user database name (provided in system context)'),
  }),
  outputSchema: z.object({
    data: z.array(z.record(z.string(), z.any())),
    totalCount: z.number(),
    filterUrl: z.string(),
  }),
  execute: async ({ context }) => {
    const { filters, dbName } = context
    const db = await getDb(dbName)
    const collection = db.collection('samples')
    const mongoFilter = buildMongoFilter(filters)
    const [data, totalCount] = await Promise.all([
      collection.find(mongoFilter).limit(50).toArray(),
      collection.countDocuments(mongoFilter),
    ])
    // Serialize ObjectIds and Dates
    const serialized = data.map(doc => ({
      ...doc,
      _id: doc._id?.toString(),
      date: doc.date instanceof Date ? doc.date.toISOString().slice(0, 10) : doc.date,
    }))
    return { data: serialized, totalCount, filterUrl: buildFilterUrl('samples', filters) }
  },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd mastra && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mastra/src/tools/querySamples.ts
git commit -m "feat: add querySamples Mastra tool"
```

---

## Task 4: queryTraits tool

**Files:**
- Create: `mastra/src/tools/queryTraits.ts`

- [ ] **Step 1: Write `mastra/src/tools/queryTraits.ts`**

```typescript
// mastra/src/tools/queryTraits.ts
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { getDb } from '../db/client'
import { buildFilterUrl } from './querySamples'

const FiltersSchema = z.record(z.string(), z.string()).describe(
  'Field filters. Supports *, comma-separated OR, and _gte/_lte date suffixes.'
)

function buildMongoFilter(filters: Record<string, string>): Record<string, any> {
  const mongo: Record<string, any> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue
    if (key.endsWith('_gte')) {
      const field = key.slice(0, -4)
      mongo[field] = { ...mongo[field], $gte: new Date(value) }
    } else if (key.endsWith('_lte')) {
      const field = key.slice(0, -4)
      mongo[field] = { ...mongo[field], $lte: new Date(value) }
    } else if (value.includes('*')) {
      const pattern = '^' + value
        .split('*')
        .map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*') + '$'
      mongo[key] = { $regex: new RegExp(pattern, 'i') }
    } else if (value.includes(',')) {
      mongo[key] = { $in: value.split(',').map(v => v.trim()).filter(Boolean) }
    } else {
      mongo[key] = value
    }
  }
  return mongo
}

export const queryTraits = createTool({
  id: 'queryTraits',
  description: 'Query the traits collection. Returns up to 50 matching records and the total count.',
  inputSchema: z.object({
    filters: FiltersSchema.default({}),
    dbName: z.string().describe('The user database name'),
  }),
  outputSchema: z.object({
    data: z.array(z.record(z.string(), z.any())),
    totalCount: z.number(),
    filterUrl: z.string(),
  }),
  execute: async ({ context }) => {
    const { filters, dbName } = context
    const db = await getDb(dbName)
    const collection = db.collection('traits')
    const mongoFilter = buildMongoFilter(filters)
    const [data, totalCount] = await Promise.all([
      collection.find(mongoFilter).limit(50).toArray(),
      collection.countDocuments(mongoFilter),
    ])
    const serialized = data.map(doc => ({
      ...doc,
      _id: doc._id?.toString(),
    }))
    return { data: serialized, totalCount, filterUrl: buildFilterUrl('traits', filters) }
  },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd mastra && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mastra/src/tools/queryTraits.ts
git commit -m "feat: add queryTraits Mastra tool"
```

---

## Task 5: createSamples + createTraits tools

These tools validate proposed records and return them for readback — they never write to the database.

**Files:**
- Create: `mastra/src/tools/createSamples.ts`
- Create: `mastra/src/tools/createTraits.ts`

- [ ] **Step 1: Write `mastra/src/tools/createSamples.ts`**

```typescript
// mastra/src/tools/createSamples.ts
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const SampleRecordSchema = z.object({
  name: z.string().describe('Sample identifier, e.g. "Araatr1"'),
  type: z.enum(['animal', 'silk', 'subsample', 'plant', 'preserved', 'artificial']),
  genus: z.string().optional(),
  species: z.string().optional(),
  family: z.string().optional(),
  location: z.string().optional(),
  date: z.string().optional().describe('ISO date string YYYY-MM-DD'),
  sex: z.enum(['male', 'female', 'unknown']).optional(),
  box: z.string().optional(),
  slot: z.string().optional(),
  notes: z.string().optional(),
})

export const createSamples = createTool({
  id: 'createSamples',
  description: 'Validate and stage sample records for user confirmation. Does NOT write to the database.',
  inputSchema: z.object({
    records: z.array(SampleRecordSchema).min(1).describe('Proposed sample records to create'),
  }),
  outputSchema: z.object({
    records: z.array(SampleRecordSchema),
    warnings: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const warnings: string[] = []
    const records = context.records.map(r => {
      const rec = { ...r }
      // Normalise date to YYYY-MM-DD
      if (rec.date && !rec.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parsed = new Date(rec.date)
        if (!isNaN(parsed.getTime())) {
          rec.date = parsed.toISOString().slice(0, 10)
        } else {
          warnings.push(`Could not parse date "${rec.date}" for sample "${rec.name}" — left as-is.`)
        }
      }
      if (!rec.date) {
        rec.date = new Date().toISOString().slice(0, 10)
        warnings.push(`No date provided for sample "${rec.name}" — defaulted to today.`)
      }
      return rec
    })
    return { records, warnings }
  },
})
```

- [ ] **Step 2: Write `mastra/src/tools/createTraits.ts`**

```typescript
// mastra/src/tools/createTraits.ts
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const TraitRecordSchema = z.object({
  type: z.string().describe('Trait type, e.g. "diameter", "tensile_strength"'),
  measurement: z.number().describe('Numeric measurement value'),
  unit: z.string().optional().describe('Unit of measurement, e.g. "mm", "MPa"'),
  sampleName: z.string().describe('Name of the associated sample'),
  date: z.string().optional().describe('ISO date string YYYY-MM-DD'),
  detail: z.string().optional().describe('Subtype or detail, e.g. "dragline"'),
  nfibres: z.number().optional().describe('Number of fibres (for silk measurements)'),
  notes: z.string().optional(),
})

export const createTraits = createTool({
  id: 'createTraits',
  description: 'Validate and stage trait records for user confirmation. Does NOT write to the database.',
  inputSchema: z.object({
    records: z.array(TraitRecordSchema).min(1).describe('Proposed trait records to create'),
  }),
  outputSchema: z.object({
    records: z.array(TraitRecordSchema),
    warnings: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const warnings: string[] = []
    const records = context.records.map(r => {
      const rec = { ...r }
      if (rec.date && !rec.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parsed = new Date(rec.date)
        if (!isNaN(parsed.getTime())) {
          rec.date = parsed.toISOString().slice(0, 10)
        } else {
          warnings.push(`Could not parse date "${rec.date}" for trait of sample "${rec.sampleName}".`)
        }
      }
      if (!rec.date) {
        rec.date = new Date().toISOString().slice(0, 10)
        warnings.push(`No date for trait of sample "${rec.sampleName}" — defaulted to today.`)
      }
      return rec
    })
    return { records, warnings }
  },
})
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd mastra && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add mastra/src/tools/createSamples.ts mastra/src/tools/createTraits.ts
git commit -m "feat: add createSamples and createTraits staging tools"
```

---

## Task 6: checkTaxonomicName tool

**Files:**
- Create: `mastra/src/tools/checkTaxonomicName.ts`

- [ ] **Step 1: Write `mastra/src/tools/checkTaxonomicName.ts`**

The tool calls the existing `/api/checknames` endpoint on the Next.js app (same Docker network). The Next.js service name in docker-compose is `node`; the URL comes from `NEXTJS_BASE_URL` env var.

```typescript
// mastra/src/tools/checkTaxonomicName.ts
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const baseUrl = process.env.NEXTJS_BASE_URL ?? 'http://node:3000'

export const checkTaxonomicName = createTool({
  id: 'checkTaxonomicName',
  description: 'Verify a scientific name (genus, species, or binomial) using the World Spider Catalog or Global Names verifier.',
  inputSchema: z.object({
    taxa: z.string().describe('Scientific name to check, e.g. "Araneus diadematus"'),
    method: z.enum(['correctName', 'fullTaxaInfo']).default('correctName'),
    family: z.string().optional().describe('Optional family name to aid disambiguation'),
  }),
  outputSchema: z.object({
    valid: z.boolean(),
    correctedName: z.string().optional(),
    taxInfo: z.any().optional(),
    rawResponse: z.any(),
  }),
  execute: async ({ context }) => {
    const res = await fetch(`${baseUrl}/api/checknames`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taxa: context.taxa,
        method: context.method,
        family: context.family,
      }),
    })
    const rawResponse = await res.json()
    const valid = res.ok && !rawResponse.error
    return {
      valid,
      correctedName: rawResponse.correctName ?? rawResponse.name,
      taxInfo: rawResponse.taxInfo ?? rawResponse,
      rawResponse,
    }
  },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd mastra && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mastra/src/tools/checkTaxonomicName.ts
git commit -m "feat: add checkTaxonomicName Mastra tool"
```

---

## Task 7: generateTreemap + getSchema tools

**Files:**
- Create: `mastra/src/tools/generateTreemap.ts`
- Create: `mastra/src/tools/getSchema.ts`

- [ ] **Step 1: Write `mastra/src/tools/generateTreemap.ts`**

Builds Plotly treemap data. The `ids`, `labels`, `parents`, and `values` arrays follow the Plotly treemap format.

```typescript
// mastra/src/tools/generateTreemap.ts
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { getDb } from '../db/client'

export const generateTreemap = createTool({
  id: 'generateTreemap',
  description: 'Build a Plotly treemap of samples or traits grouped by taxonomic or categorical hierarchy.',
  inputSchema: z.object({
    entity: z.enum(['samples', 'traits']).default('samples'),
    hierarchy: z.array(z.string()).default(['family', 'genus', 'species'])
      .describe('Ordered list of fields to group by, outermost first'),
    dbName: z.string(),
    filters: z.record(z.string(), z.string()).default({}),
  }),
  outputSchema: z.object({
    ids: z.array(z.string()),
    labels: z.array(z.string()),
    parents: z.array(z.string()),
    values: z.array(z.number()),
    title: z.string(),
  }),
  execute: async ({ context }) => {
    const { entity, hierarchy, dbName, filters } = context
    const db = await getDb(dbName)
    const docs = await db.collection(entity).find(filters as any).toArray()

    const nodeMap = new Map<string, number>()

    const addNode = (id: string, label: string, parent: string) => {
      if (!nodeMap.has(id)) nodeMap.set(id, 0)
    }

    // Build node map from documents
    for (const doc of docs) {
      let parentId = ''
      for (const field of hierarchy) {
        const val = doc[field] ?? '(unknown)'
        const id = parentId ? `${parentId}/${field}:${val}` : `${field}:${val}`
        nodeMap.set(id, (nodeMap.get(id) ?? 0) + (hierarchy.indexOf(field) === hierarchy.length - 1 ? 1 : 0))
        parentId = id
      }
    }

    // Build id/label/parent/value arrays with correct counts
    const counts = new Map<string, number>()
    for (const doc of docs) {
      let parentId = ''
      const pathIds: string[] = []
      for (let i = 0; i < hierarchy.length; i++) {
        const field = hierarchy[i]
        const val = doc[field] ?? '(unknown)'
        const id = parentId ? `${parentId}/${field}:${val}` : `${field}:${val}`
        pathIds.push(id)
        counts.set(id, (counts.get(id) ?? 0) + 1)
        parentId = id
      }
    }

    const seen = new Set<string>()
    const ids: string[] = []
    const labels: string[] = []
    const parents: string[] = []
    const values: number[] = []

    for (const doc of docs) {
      let parentId = ''
      for (let i = 0; i < hierarchy.length; i++) {
        const field = hierarchy[i]
        const val = doc[field] ?? '(unknown)'
        const id = parentId ? `${parentId}/${field}:${val}` : `${field}:${val}`
        if (!seen.has(id)) {
          seen.add(id)
          ids.push(id)
          labels.push(String(val))
          parents.push(parentId)
          values.push(counts.get(id) ?? 0)
        }
        parentId = id
      }
    }

    return {
      ids,
      labels,
      parents,
      values,
      title: `${entity} by ${hierarchy.join(' › ')}`,
    }
  },
})
```

- [ ] **Step 2: Write `mastra/src/tools/getSchema.ts`**

```typescript
// mastra/src/tools/getSchema.ts
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const baseUrl = process.env.NEXTJS_BASE_URL ?? 'http://node:3000'

export const getSchema = createTool({
  id: 'getSchema',
  description: 'Fetch the live filterable column names for each entity type. Call this at the start of a new conversation to understand what fields are available.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    routes: z.array(z.object({
      label: z.string(),
      path: z.string(),
      columns: z.array(z.string()),
    })),
  }),
  execute: async () => {
    const res = await fetch(`${baseUrl}/api/schema`)
    if (!res.ok) throw new Error(`Schema fetch failed: ${res.status}`)
    return res.json()
  },
})
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd mastra && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add mastra/src/tools/generateTreemap.ts mastra/src/tools/getSchema.ts
git commit -m "feat: add generateTreemap and getSchema Mastra tools"
```

---

## Task 8: Mastra agent

**Files:**
- Create: `mastra/src/agent.ts`

- [ ] **Step 1: Write `mastra/src/agent.ts`**

The `dbName` must be passed per-request (different users have different databases). Include it in the system prompt as a runtime-injected value — the server reads it from the request and prepends it to the messages.

```typescript
// mastra/src/agent.ts
import { Agent } from '@mastra/core/agent'
import { anthropic } from '@ai-sdk/anthropic'
import { querySamples } from './tools/querySamples'
import { queryTraits } from './tools/queryTraits'
import { createSamples } from './tools/createSamples'
import { createTraits } from './tools/createTraits'
import { checkTaxonomicName } from './tools/checkTaxonomicName'
import { generateTreemap } from './tools/generateTreemap'
import { getSchema } from './tools/getSchema'

const SYSTEM_PROMPT = `You are the EvoNEST research assistant — a conversational interface for a biodiversity specimen database used by biology labs. EvoNEST stores samples (animal specimens, silk samples, preserved specimens, plants, etc.), traits (measurements such as diameter, weight, tensile strength), and experiments.

You help researchers explore, analyse, and contribute to their database through natural conversation. The researcher's database name is provided in each message as a context note — always pass it as the dbName argument to tools.

TOOLS:
- querySamples: search samples by any combination of fields (genus, species, type, location, date, box, etc.)
- queryTraits: search trait measurements with filters
- createSamples: validate and stage sample records for user confirmation — never writes directly
- createTraits: validate and stage trait records for user confirmation — never writes directly
- checkTaxonomicName: verify a scientific name using the World Spider Catalog or Global Names verifier
- generateTreemap: build a hierarchical visualisation of samples or traits
- getSchema: fetch the live filterable field names for samples, traits, and experiments

RULES:
1. Call getSchema at the start of each new conversation thread.
2. When showing or finding data, call querySamples or queryTraits, then return a "table" block.
3. When adding records, call createSamples or createTraits, then return a "readback" block. Never save directly.
4. When checking a name, call checkTaxonomicName, then explain the result in a "text" block.
5. When asked for a chart, call the relevant query tool for data, then return a "chart" block.
6. When asked for a treemap or hierarchy, call generateTreemap, then return a "chart" block with chartType "treemap".
7. Always start your response with a "text" block that briefly explains what you found or did.

RESPONSE FORMAT — your entire response MUST be a JSON object matching exactly:
{
  "blocks": [
    { "type": "text", "content": "markdown explanation" },
    { "type": "table", "entity": "samples"|"traits", "data": [...up to 50 records], "totalCount": N, "filterUrl": "/samples/general?field=value" },
    { "type": "chart", "chartType": "bar"|"scatter"|"line"|"treemap", "title": "...", "data": [...], "config": {} },
    { "type": "readback", "entity": "samples"|"traits", "records": [...], "pendingCreate": true }
  ]
}
Only include block types relevant to the current response. Always include at least one "text" block.`

export const evonestAgent = new Agent({
  name: 'evonestAgent',
  instructions: SYSTEM_PROMPT,
  model: anthropic('claude-sonnet-4-6'),
  tools: {
    querySamples,
    queryTraits,
    createSamples,
    createTraits,
    checkTaxonomicName,
    generateTreemap,
    getSchema,
  },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd mastra && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mastra/src/agent.ts
git commit -m "feat: add EvoNEST Mastra agent with system prompt and tool wiring"
```

---

## Task 9: Mastra Express server

**Files:**
- Create: `mastra/src/index.ts`

- [ ] **Step 1: Write `mastra/src/index.ts`**

The server receives `{ message, threadId, dbName }` and prepends the dbName as a system context note so the agent always has it available.

```typescript
// mastra/src/index.ts
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
    // Prepend dbName as context so tools receive it without the user needing to say it
    const contextualMessage = `[context: dbName="${dbName}"]\n\n${message}`

    const result = await evonestAgent.generate(contextualMessage, {
      threadId,
      resourceId: threadId,
      output: AgentResponseSchema,
    })

    return res.json({ blocks: result.object.blocks })
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd mastra && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mastra/src/index.ts
git commit -m "feat: add Mastra Express server entrypoint"
```

---

## Task 10: Docker Compose update

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.dev.yml`

- [ ] **Step 1: Add mastra service to `docker-compose.yml`**

Add the following block inside `services:`, after the `backup:` service:

```yaml
  mastra:
    build:
      context: ./mastra
      dockerfile: Dockerfile
    container_name: evonest_mastra_prod
    restart: unless-stopped
    env_file:
      - .env.production
      - .env.local
    environment:
      NEXTJS_BASE_URL: http://node:3000
      PORT: "4111"
    ports:
      - "4111:4111"
    depends_on:
      - mongo
      - node
```

Also add `- mastra` to the `depends_on` list of the `node` service — remove that dependency if you'd rather start Mastra after Next.js is healthy (simpler). Instead, just ensure Next.js doesn't crash if Mastra isn't up immediately (the proxy route handles Mastra errors gracefully).

- [ ] **Step 2: Add mastra service to `docker-compose.dev.yml`**

Add after the `mongo_dev:` service:

```yaml
  mastra_dev:
    build:
      context: ./mastra
      dockerfile: Dockerfile
    container_name: evonest_mastra_dev
    restart: unless-stopped
    env_file:
      - .env.development
      - .env.local
    environment:
      NEXTJS_BASE_URL: http://node:3005
      PORT: "4111"
    ports:
      - "4111:4111"
    depends_on:
      - mongo_dev
```

- [ ] **Step 3: Add required env vars to `.env.local`**

Add these lines (never commit this file):

```bash
# Mastra AI
ANTHROPIC_API_KEY=your-anthropic-api-key-here
MASTRA_URL=http://localhost:4111
```

- [ ] **Step 4: Test the service starts**

```bash
cd mastra && npm run dev
```

Expected: `Mastra service listening on port 4111`

```bash
curl http://localhost:4111/health
```

Expected: `{"ok":true}`

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml docker-compose.dev.yml
git commit -m "feat: add mastra service to Docker Compose"
```

---

## Task 11: Next.js proxy route

**Files:**
- Create: `src/app/api/ai/chat/route.ts`
- Create: `src/__tests__/api/ai-chat-proxy.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/__tests__/api/ai-chat-proxy.test.ts
import { POST } from '@/app/api/ai/chat/route'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/app/api/auth/[...nextauth]/options', () => ({
  authOptions: {},
}))

jest.mock('@/app/api/utils/mongodbClient', () => ({
  get_or_create_client: jest.fn(),
}))

jest.mock('@/app/api/utils/get_database_user', () => ({
  get_database_user: jest.fn(),
}))

const { getServerSession } = require('next-auth')
const { get_database_user } = require('@/app/api/utils/get_database_user')

describe('POST /api/ai/chat', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns 401 when not authenticated', async () => {
    getServerSession.mockResolvedValue(null)
    const req = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello', threadId: 'test-thread' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  test('returns 400 when message is missing', async () => {
    getServerSession.mockResolvedValue({ user: { name: 'alice' } })
    get_database_user.mockResolvedValue('testdb')
    const req = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: 'test-thread' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern="ai-chat-proxy" --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/api/ai/chat/route'`

- [ ] **Step 3: Write `src/app/api/ai/chat/route.ts`**

```typescript
// src/app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { get_database_user } from '@/app/api/utils/get_database_user'

const MASTRA_URL = process.env.MASTRA_URL ?? 'http://localhost:4111'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { message, threadId } = body

  if (!message || !threadId) {
    return NextResponse.json({ error: 'message and threadId are required' }, { status: 400 })
  }

  let dbName: string
  try {
    dbName = await get_database_user()
  } catch {
    return NextResponse.json({ error: 'Could not resolve user database' }, { status: 500 })
  }

  try {
    const mastraRes = await fetch(`${MASTRA_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, threadId, dbName }),
    })
    const data = await mastraRes.json()
    return NextResponse.json(data, { status: mastraRes.ok ? 200 : 502 })
  } catch {
    return NextResponse.json({
      blocks: [{ type: 'text', content: 'Could not reach the AI service. Please try again.' }],
    }, { status: 200 })
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- --testPathPattern="ai-chat-proxy" --no-coverage
```

Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/ai/chat/route.ts src/__tests__/api/ai-chat-proxy.test.ts
git commit -m "feat: add /api/ai/chat proxy route with auth check"
```

---

## Task 12: TextBlock component

**Files:**
- Create: `src/components/nest/ai/blocks/TextBlock.tsx`

- [ ] **Step 1: Write `src/components/nest/ai/blocks/TextBlock.tsx`**

```tsx
// src/components/nest/ai/blocks/TextBlock.tsx
"use client"

import { TextBlock as TextBlockType } from '@/lib/ai-types'

export function TextBlock({ block }: { block: TextBlockType }) {
  // Render markdown-like content: split on double newlines into paragraphs
  const paragraphs = block.content.split(/\n\n+/).filter(Boolean)
  return (
    <div className="text-sm text-foreground leading-relaxed space-y-2">
      {paragraphs.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/nest/ai/blocks/TextBlock.tsx
git commit -m "feat: add TextBlock AI canvas component"
```

---

## Task 13: TableBlock component

**Files:**
- Create: `src/components/nest/ai/blocks/TableBlock.tsx`
- Create: `src/__tests__/components/ai/TableBlock.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/__tests__/components/ai/TableBlock.test.tsx
import { render, screen } from '@testing-library/react'
import { TableBlock } from '@/components/nest/ai/blocks/TableBlock'
import '@testing-library/jest-dom'

const makeBlock = (count: number, total: number) => ({
  type: 'table' as const,
  entity: 'samples' as const,
  data: Array.from({ length: count }, (_, i) => ({
    name: `Sample ${i + 1}`,
    type: 'silk',
    location: 'Spain',
  })),
  totalCount: total,
  filterUrl: '/samples/general?type=silk',
})

describe('TableBlock', () => {
  test('renders up to 5 rows on desktop', () => {
    render(<TableBlock block={makeBlock(10, 10)} />)
    const rows = screen.getAllByRole('row')
    // 1 header + 5 data rows
    expect(rows.length).toBe(6)
  })

  test('shows "View all" link when totalCount exceeds row limit', () => {
    render(<TableBlock block={makeBlock(10, 10)} />)
    const link = screen.getByRole('link', { name: /view all 10/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/samples/general?type=silk')
  })

  test('does not show "View all" link when all rows are shown', () => {
    render(<TableBlock block={makeBlock(3, 3)} />)
    expect(screen.queryByRole('link', { name: /view all/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern="TableBlock" --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/nest/ai/blocks/TableBlock.tsx`**

```tsx
// src/components/nest/ai/blocks/TableBlock.tsx
"use client"

import Link from 'next/link'
import { TableBlock as TableBlockType } from '@/lib/ai-types'

const DESKTOP_LIMIT = 5
const MOBILE_LIMIT = 2

export function TableBlock({ block }: { block: TableBlockType }) {
  const { data, totalCount, filterUrl, entity } = block
  if (!data.length) return <p className="text-sm text-muted-foreground">No results found.</p>

  const columns = Object.keys(data[0]).filter(k => k !== '_id')
  // Use CSS to show different row counts on mobile vs desktop
  const showViewAll = totalCount > DESKTOP_LIMIT

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border text-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map(col => (
                <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground capitalize">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, DESKTOP_LIMIT).map((row, i) => (
              <tr
                key={i}
                className={`border-b last:border-0 ${i >= MOBILE_LIMIT ? 'hidden md:table-row' : ''}`}
              >
                {columns.map(col => (
                  <td key={col} className="px-3 py-2 text-muted-foreground">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showViewAll && (
        <Link
          href={filterUrl}
          className="text-xs text-primary underline-offset-2 hover:underline"
        >
          View all {totalCount} results in {entity} table →
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- --testPathPattern="TableBlock" --no-coverage
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/nest/ai/blocks/TableBlock.tsx src/__tests__/components/ai/TableBlock.test.tsx
git commit -m "feat: add TableBlock with truncation and View all link"
```

---

## Task 14: ChartBlock component

**Files:**
- Create: `src/components/nest/ai/blocks/ChartBlock.tsx`

- [ ] **Step 1: Write `src/components/nest/ai/blocks/ChartBlock.tsx`**

Bar, scatter, and line use recharts (already installed). Treemap uses Plotly (already installed as `plotly.js`).

```tsx
// src/components/nest/ai/blocks/ChartBlock.tsx
"use client"

import dynamic from 'next/dynamic'
import {
  BarChart, Bar, ScatterChart, Scatter, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ChartBlock as ChartBlockType } from '@/lib/ai-types'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export function ChartBlock({ block }: { block: ChartBlockType }) {
  const { chartType, title, data, config } = block

  if (chartType === 'treemap') {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <Plot
          data={[{
            type: 'treemap',
            ids: data.map((d: any) => d.id),
            labels: data.map((d: any) => d.label),
            parents: data.map((d: any) => d.parent),
            values: data.map((d: any) => d.value),
            ...config,
          }]}
          layout={{ margin: { t: 0, b: 0, l: 0, r: 0 }, height: 300 }}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: '100%' }}
        />
      </div>
    )
  }

  const xKey = config.xKey ?? Object.keys(data[0] ?? {})[0]
  const yKey = config.yKey ?? Object.keys(data[0] ?? {})[1]

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ResponsiveContainer width="100%" height={240}>
        {chartType === 'bar' ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey={yKey} fill="hsl(var(--primary))" />
          </BarChart>
        ) : chartType === 'scatter' ? (
          <ScatterChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
            <YAxis dataKey={yKey} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Scatter fill="hsl(var(--primary))" />
          </ScatterChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke="hsl(var(--primary))" dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/nest/ai/blocks/ChartBlock.tsx
git commit -m "feat: add ChartBlock (recharts + Plotly treemap)"
```

---

## Task 15: ReadbackBlock component

**Files:**
- Create: `src/components/nest/ai/blocks/ReadbackBlock.tsx`
- Create: `src/__tests__/components/ai/ReadbackBlock.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/__tests__/components/ai/ReadbackBlock.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ReadbackBlock } from '@/components/nest/ai/blocks/ReadbackBlock'
import '@testing-library/jest-dom'

const block = {
  type: 'readback' as const,
  entity: 'samples' as const,
  records: [
    { name: 'Araatr1', type: 'silk', genus: 'Argiope', species: 'bruennichi', location: 'Spain', date: '2024-03-15' },
    { name: 'Araatr2', type: 'animal', genus: 'Araneus', species: 'diadematus', location: 'Italy', date: '2024-03-20' },
  ],
  pendingCreate: true as const,
}

describe('ReadbackBlock', () => {
  test('renders all records', () => {
    render(<ReadbackBlock block={block} onConfirm={jest.fn()} onFix={jest.fn()} />)
    expect(screen.getByText('Araatr1')).toBeInTheDocument()
    expect(screen.getByText('Araatr2')).toBeInTheDocument()
  })

  test('calls onConfirm with records when Confirm is clicked', () => {
    const onConfirm = jest.fn()
    render(<ReadbackBlock block={block} onConfirm={onConfirm} onFix={jest.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onConfirm).toHaveBeenCalledWith(block.records)
  })

  test('calls onFix when Fix is clicked', () => {
    const onFix = jest.fn()
    render(<ReadbackBlock block={block} onConfirm={jest.fn()} onFix={onFix} />)
    fireEvent.click(screen.getByRole('button', { name: /fix/i }))
    expect(onFix).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern="ReadbackBlock" --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Write `src/components/nest/ai/blocks/ReadbackBlock.tsx`**

```tsx
// src/components/nest/ai/blocks/ReadbackBlock.tsx
"use client"

import { ReadbackBlock as ReadbackBlockType } from '@/lib/ai-types'
import { Button } from '@/components/ui/button'

interface Props {
  block: ReadbackBlockType
  onConfirm: (records: Record<string, any>[]) => void
  onFix: () => void
  confirming?: boolean
}

export function ReadbackBlock({ block, onConfirm, onFix, confirming }: Props) {
  const { records, entity } = block
  if (!records.length) return null
  const columns = Object.keys(records[0]).filter(k => k !== '_id')

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Review these {records.length} {entity} — type a correction or confirm to save:
      </p>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto rounded-md border text-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map(col => (
                <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground capitalize">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                {columns.map(col => (
                  <td key={col} className="px-3 py-2">{String(row[col] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {records.map((row, i) => (
          <div key={i} className="rounded-md border p-3 space-y-1 border-l-2 border-l-primary">
            <p className="font-medium text-sm">{row.name ?? row.type ?? `Record ${i + 1}`}</p>
            <p className="text-xs text-muted-foreground">
              {columns.filter(c => c !== 'name').map(c => `${c}: ${row[c] ?? '—'}`).join(' · ')}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onConfirm(records)}
          disabled={confirming}
          className="bg-green-700 hover:bg-green-600 text-white"
        >
          {confirming ? 'Saving…' : 'Confirm and save'}
        </Button>
        <Button size="sm" variant="outline" onClick={onFix}>
          Fix
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- --testPathPattern="ReadbackBlock" --no-coverage
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/nest/ai/blocks/ReadbackBlock.tsx src/__tests__/components/ai/ReadbackBlock.test.tsx
git commit -m "feat: add ReadbackBlock (desktop table + mobile cards)"
```

---

## Task 16: CommandBar component

**Files:**
- Create: `src/components/nest/ai/CommandBar.tsx`

- [ ] **Step 1: Write `src/components/nest/ai/CommandBar.tsx`**

```tsx
// src/components/nest/ai/CommandBar.tsx
"use client"

import { useState, KeyboardEvent } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  onSend: (message: string) => void
  loading?: boolean
}

export function CommandBar({ onSend, loading }: Props) {
  const [value, setValue] = useState('')

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || loading) return
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything — check a name, add samples, plot traits by species…"
        className="h-10 text-sm"
        disabled={loading}
        autoFocus
      />
      <Button
        onClick={handleSend}
        disabled={!value.trim() || loading}
        size="icon"
        className="h-10 w-10 shrink-0"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/nest/ai/CommandBar.tsx
git commit -m "feat: add CommandBar component"
```

---

## Task 17: ConversationCanvas component

**Files:**
- Create: `src/components/nest/ai/ConversationCanvas.tsx`

- [ ] **Step 1: Write `src/components/nest/ai/ConversationCanvas.tsx`**

The canvas shows the world map when `messages` is empty. When messages exist, it shows the conversation history and auto-scrolls to the latest message.

```tsx
// src/components/nest/ai/ConversationCanvas.tsx
"use client"

import { useEffect, useRef, useState } from 'react'
import { MessageBlock } from '@/lib/ai-types'
import { TextBlock } from './blocks/TextBlock'
import { TableBlock } from './blocks/TableBlock'
import { ChartBlock } from './blocks/ChartBlock'
import { ReadbackBlock } from './blocks/ReadbackBlock'
import { prepend_path } from '@/lib/utils'
import MapboxScatterPlot from '@/components/plots/scatter-map'

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content?: string          // user messages
  blocks?: MessageBlock[]   // assistant messages
}

interface Props {
  messages: ConversationMessage[]
  samplesData: any[]
  onFix?: (blockIndex: number) => void
  onConfirm?: (entity: string, records: Record<string, any>[]) => void
  confirmingIndex?: number
}

function BlockRenderer({
  block,
  onConfirm,
  onFix,
  confirming,
}: {
  block: MessageBlock
  onConfirm: (records: Record<string, any>[]) => void
  onFix: () => void
  confirming?: boolean
}) {
  switch (block.type) {
    case 'text':    return <TextBlock block={block} />
    case 'table':   return <TableBlock block={block} />
    case 'chart':   return <ChartBlock block={block} />
    case 'readback':
      return <ReadbackBlock block={block} onConfirm={onConfirm} onFix={onFix} confirming={confirming} />
    default:        return null
  }
}

export function ConversationCanvas({ messages, samplesData, onFix, onConfirm, confirmingIndex }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="relative rounded-lg overflow-hidden min-h-[300px] flex-1">
        {samplesData?.length > 0 && <MapboxScatterPlot samplesData={samplesData} />}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg px-5 py-3 text-center">
            <p className="text-sm font-medium">Your collection</p>
            <p className="text-xs text-muted-foreground mt-1">Ask a question above to explore</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
      {messages.map((msg, msgIdx) => (
        <div key={msgIdx}>
          {msg.role === 'user' ? (
            <div className="flex justify-end">
              <div className="bg-muted rounded-lg px-3 py-2 text-sm max-w-[80%]">
                {msg.content}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {msg.blocks?.map((block, blockIdx) => (
                <div key={blockIdx} className="bg-card border rounded-lg px-3 py-2">
                  <BlockRenderer
                    block={block}
                    onConfirm={records => onConfirm?.(
                      block.type === 'readback' ? block.entity : 'samples',
                      records
                    )}
                    onFix={() => onFix?.(blockIdx)}
                    confirming={confirmingIndex === blockIdx}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/nest/ai/ConversationCanvas.tsx
git commit -m "feat: add ConversationCanvas with empty-state world map"
```

---

## Task 18: Home page rewrite

**Files:**
- Modify: `src/app/(nest)/home/page.tsx` (full rewrite)
- Delete: `src/components/nest/NlGlobalSearchCard.tsx`

- [ ] **Step 1: Delete `NlGlobalSearchCard.tsx`**

```bash
git rm src/components/nest/NlGlobalSearchCard.tsx
```

- [ ] **Step 2: Rewrite `src/app/(nest)/home/page.tsx`**

```tsx
// src/app/(nest)/home/page.tsx
"use client"

import { useCallback, useRef, useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useExperimentsData } from '@/hooks/useExperimentData'
import { useSampleData } from '@/hooks/useSampleData'
import { useTraitData } from '@/hooks/useTraitData'
import { useUserData } from '@/hooks/useUserData'
import { prepend_path } from '@/lib/utils'
import { PiBug, PiGraphBold, PiRulerBold, PiUsersBold } from 'react-icons/pi'
import NumberTicker from '@/components/magicui/number-ticker'
import { useAuth } from '@/hooks/useAuth'
import { useConfigCheck } from '@/hooks/useConfigCheck'
import { ConfigSetup } from '@/components/config-setup'
import { CardSamples } from '@/components/nest/dashboard/card-samples'
import { DemoDescription } from '@/components/nest/dashboard/demo-description'
import { CommandBar } from '@/components/nest/ai/CommandBar'
import { ConversationCanvas, ConversationMessage } from '@/components/nest/ai/ConversationCanvas'
import { toast } from 'sonner'

function getOrCreateThreadId(): string {
  if (typeof window === 'undefined') return crypto.randomUUID()
  const existing = sessionStorage.getItem('evonest-thread-id')
  if (existing) return existing
  const id = crypto.randomUUID()
  sessionStorage.setItem('evonest-thread-id', id)
  return id
}

export default function Home() {
  const { samplesData, samplesError } = useSampleData(prepend_path, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    keepPreviousData: true,
  })
  const { usersData } = useUserData(prepend_path)
  const { traitsData } = useTraitData(prepend_path)
  const { experimentsData } = useExperimentsData(prepend_path)
  const { session, isLoading } = useAuth()
  const { configExists, loading } = useConfigCheck()

  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const threadIdRef = useRef<string | null>(null)

  if (!threadIdRef.current) {
    threadIdRef.current = getOrCreateThreadId()
  }

  const handleSend = useCallback(async (text: string) => {
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setAiLoading(true)
    try {
      const res = await fetch(`${prepend_path}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, threadId: threadIdRef.current }),
      })
      const { blocks } = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', blocks }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        blocks: [{ type: 'text', content: 'Something went wrong. Please try again.' }],
      }])
    } finally {
      setAiLoading(false)
    }
  }, [])

  const handleConfirm = useCallback(async (entity: string, records: Record<string, any>[]) => {
    try {
      const endpoint = entity === 'traits' ? `${prepend_path}/api/traits` : `${prepend_path}/api/samples`
      await Promise.all(records.map(record =>
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        })
      ))
      toast.success(`${records.length} ${entity} saved successfully`)
    } catch {
      toast.error('Failed to save records. Please try again.')
    }
  }, [])

  const handleFix = useCallback(() => {
    // Focus the command bar so the user can type a correction
    document.querySelector<HTMLInputElement>('input[placeholder*="Ask anything"]')?.focus()
  }, [])

  if (loading) return <div>Loading…</div>
  if (configExists === false) {
    return (
      <div className="container mx-auto py-8">
        <ConfigSetup onComplete={() => window.location.reload()} />
      </div>
    )
  }
  if (isLoading) return <div>Loading…</div>

  const isDemo = session?.user?.name === 'demo'
  const totalSamples = samplesData?.length ?? 0
  const totalUsers = usersData?.length ?? 0
  const totalTraits = traitsData?.length ?? 0
  const totalExperiments = experimentsData?.length ?? 0
  const uniqueGenus = samplesData ? new Set(samplesData.map((s: any) => s.genus)).size : 0
  const uniqueSpecies = samplesData
    ? new Set(samplesData.map((s: any) => `${s.genus} ${s.species}`)).size
    : 0
  const lastWeek = new Date(); lastWeek.setDate(lastWeek.getDate() - 7)
  const samplesLastWeek = samplesData?.filter((s: any) => new Date(s.date) > lastWeek).length ?? 0

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {isDemo && <DemoDescription />}

        {/* Command bar */}
        <CommandBar onSend={handleSend} loading={aiLoading} />

        {/* Canvas + sidebar */}
        <div className="flex gap-4 min-h-[400px]">
          <ConversationCanvas
            messages={messages}
            samplesData={samplesData ?? []}
            onConfirm={handleConfirm}
            onFix={handleFix}
          />
          {/* CardSamples sidebar — desktop only */}
          <div className="hidden lg:block w-72 shrink-0">
            {samplesData ? (
              <CardSamples data={samplesData} />
            ) : (
              <Skeleton className="h-full w-full rounded-xl" />
            )}
          </div>
        </div>

        {/* Collapsed dashboard accordion */}
        <Accordion type="multiple">
          <AccordionItem value="stats">
            <AccordionTrigger>Dashboard — stats &amp; recent samples</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Users</CardTitle>
                    <PiUsersBold className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <NumberTicker className="text-2xl font-bold" value={totalUsers} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Samples</CardTitle>
                    <PiBug className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <NumberTicker className="text-2xl font-bold" value={totalSamples} />
                    <p className="text-xs text-muted-foreground">
                      {uniqueGenus} genera · {uniqueSpecies} species
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Experiments</CardTitle>
                    <PiGraphBold className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <NumberTicker className="text-2xl font-bold" value={totalExperiments} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Traits</CardTitle>
                    <PiRulerBold className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <NumberTicker className="text-2xl font-bold" value={totalTraits} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Samples last week</CardTitle>
                    <PiBug className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <NumberTicker className="text-2xl font-bold" value={samplesLastWeek} />
                  </CardContent>
                </Card>
              </div>
              {/* CardSamples inside accordion on mobile */}
              <div className="lg:hidden">
                {samplesData ? <CardSamples data={samplesData} /> : <Skeleton className="h-64 w-full" />}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Run the dev server and verify the home page loads without errors**

```bash
npm run dev
```

Open `http://localhost:3005/home`. Expected:
- World map visible in the canvas area
- Command bar at the top
- CardSamples sidebar visible on wide screens
- Dashboard accordion collapsed at bottom
- No console errors

- [ ] **Step 4: Commit**

```bash
git add src/app/(nest)/home/page.tsx
git commit -m "feat: rewrite home page with Mastra AI canvas and world map empty state"
```

---

## Task 19: Navbar notification bell

**Files:**
- Modify: `src/components/nest/navbar.tsx`

Replace `DeveloperNewsCard` on the home page with a notification bell in the navbar. The bell opens a popover with the news card content.

- [ ] **Step 1: Add bell button to `navbar.tsx`**

In `src/components/nest/navbar.tsx`, first add the import at the top:

```tsx
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DeveloperNewsCard } from '@/components/developer-cards/developer-news'
import { PiBellBold } from 'react-icons/pi'
```

Then inside the top-right `<div className="absolute top-0 right-0 h-10 flex items-center gap-2 px-4">`, add the bell button directly before `<ModeToggle .../>`:

```tsx
{/* Notification bell — DeveloperNewsCard */}
<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <PiBellBold className="h-5 w-5" />
      <span className="sr-only">Developer news</span>
    </Button>
  </PopoverTrigger>
  <PopoverContent align="end" className="w-80 p-0">
    <DeveloperNewsCard />
  </PopoverContent>
</Popover>
```

- [ ] **Step 2: Run the dev server and verify the bell appears and opens the news card**

```bash
npm run dev
```

Open `http://localhost:3005/home`. Click the bell icon in the top-right. Expected: `DeveloperNewsCard` appears in a popover.

- [ ] **Step 3: Commit**

```bash
git add src/components/nest/navbar.tsx
git commit -m "feat: move DeveloperNewsCard to notification bell in navbar"
```

---

## Self-Review

Checking spec coverage:

| Spec section | Task(s) |
| --- | --- |
| Layout (command bar, canvas, sidebar, accordion) | Task 18 |
| Empty state world map | Task 17, 18 |
| Conversational canvas (history, scroll) | Task 17 |
| Response block types (text/table/chart/readback) | Tasks 12–15 |
| Result truncation + filterUrl link | Task 13 |
| Readback pattern (desktop/mobile, confirm/fix) | Task 15 |
| Write confirmation calls existing API routes | Task 18 |
| Mastra service + all tools | Tasks 3–9 |
| Separate Docker container | Tasks 2, 10 |
| Next.js proxy route + auth | Task 11 |
| useUrlFilters reused for filterUrl | Task 3, 4 (buildFilterUrl) |
| /api/schema reused by getSchema tool | Task 7 |
| NlGlobalSearchCard removed | Task 18 |
| Widget disposition (map, sidebar, accordion, bell) | Tasks 17, 18, 19 |
| Error handling (Mastra down, write failure) | Tasks 9, 11, 18 |

All spec requirements covered. ✓

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-27-mastra-home-ai.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session with checkpoints

Which approach?

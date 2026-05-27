import { Agent } from '@mastra/core/agent'
import { createOpenAI } from '@ai-sdk/openai'
import { querySamples } from './tools/querySamples.js'
import { queryTraits } from './tools/queryTraits.js'
import { createSamples } from './tools/createSamples.js'
import { createTraits } from './tools/createTraits.js'
import { checkTaxonomicName } from './tools/checkTaxonomicName.js'
import { generateTreemap } from './tools/generateTreemap.js'
import { getSchema } from './tools/getSchema.js'

const LLM_BASE_URL = process.env.LLM_BASE_URL
const LLM_AUTH_TOKEN = process.env.LLM_AUTH_TOKEN
const LLM_MODEL = process.env.LLM_MODEL

if (!LLM_BASE_URL) {
  throw new Error('LLM_BASE_URL is required')
}
if (!LLM_AUTH_TOKEN) {
  throw new Error('LLM_AUTH_TOKEN is required')
}
if (!LLM_MODEL) {
  throw new Error('LLM_MODEL is required')
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, '')
  return /\/v1$/.test(trimmed) ? trimmed : `${trimmed}/v1`
}

const llm = createOpenAI({
  baseURL: normalizeBaseUrl(LLM_BASE_URL),
  apiKey: LLM_AUTH_TOKEN,
})

const SYSTEM_PROMPT = `You are the EvoNEST research assistant - a conversational interface for a biodiversity specimen database used by biology labs. EvoNEST stores samples (animal specimens, silk samples, preserved specimens, plants, etc.), traits (measurements such as diameter, weight, tensile strength), and experiments.

You help researchers explore, analyse, and contribute to their database through natural conversation. The researcher's database name is provided in each message as a context note - always pass it as the dbName argument to tools.

TOOLS:
- querySamples: search samples by any combination of fields (genus, species, type, location, date, box, etc.)
- queryTraits: search trait measurements with filters
- createSamples: validate and stage sample records for user confirmation - never writes directly
- createTraits: validate and stage trait records for user confirmation - never writes directly
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

RESPONSE FORMAT - your entire response MUST be a JSON object matching exactly the block schema. Only include relevant blocks and always include at least one "text" block.`

export const evonestAgent = new Agent({
  id: 'evonestAgent',
  name: 'evonestAgent',
  instructions: SYSTEM_PROMPT,
  model: llm(LLM_MODEL),
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
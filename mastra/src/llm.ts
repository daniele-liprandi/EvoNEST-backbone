import { createOpenAI } from '@ai-sdk/openai'

const LLM_BASE_URL = process.env.LLM_BASE_URL
const LLM_AUTH_TOKEN = process.env.LLM_AUTH_TOKEN
const LLM_MODEL = process.env.LLM_MODEL
const LLM_API_MODE = process.env.LLM_API_MODE

if (!LLM_BASE_URL) throw new Error('LLM_BASE_URL is required')
if (!LLM_AUTH_TOKEN) throw new Error('LLM_AUTH_TOKEN is required')
if (!LLM_MODEL) throw new Error('LLM_MODEL is required')
if (!LLM_API_MODE) throw new Error('LLM_API_MODE is required (chat | responses)')
if (LLM_API_MODE !== 'chat' && LLM_API_MODE !== 'responses') {
  throw new Error('LLM_API_MODE must be either "chat" or "responses"')
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, '')
  return /\/v1$/.test(trimmed) ? trimmed : `${trimmed}/v1`
}

const llm = createOpenAI({
  baseURL: normalizeBaseUrl(LLM_BASE_URL),
  apiKey: LLM_AUTH_TOKEN,
})

export const model = LLM_API_MODE === 'chat' ? llm.chat(LLM_MODEL) : llm.responses(LLM_MODEL)

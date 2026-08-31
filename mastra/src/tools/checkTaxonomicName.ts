import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { serviceAuthHeader } from '../lib/serviceHeaders.js'

const baseUrl = process.env.NEXTJS_BASE_URL ?? 'http://node:3000'
const REQUEST_TIMEOUT_MS = 15000

export const checkTaxonomicName = createTool({
  id: 'checkTaxonomicName',  description: 'Verify a scientific name using the Global Names verifier. Use only for explicit name lookup requests — NOT before createSamples or createTraits, which handle taxonomy internally.',

  inputSchema: z.object({
    taxa: z.string().describe('Scientific name to check, e.g. "Araneus diadematus"'),
    method: z.enum(['correctName', 'fullTaxaInfo']).default('correctName'),
    source: z.enum(['auto', 'WSC', 'GNames']).default('GNames'),
    family: z.string().optional().describe('Optional family name to aid disambiguation'),
  }),
  outputSchema: z.object({
    valid: z.boolean(),
    correctedName: z.string().optional(),
    taxInfo: z.any().optional(),
    source: z.string().optional(),
    error: z.string().optional(),
    rawResponse: z.any(),
  }),
  execute: async ({ taxa, method = 'correctName', source = 'GNames', family }) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(`${baseUrl}/api/checknames`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...serviceAuthHeader() },
        body: JSON.stringify({
          taxa: taxa.trim(),
          method,
          source,
          family,
        }),
        signal: controller.signal,
      })

      const rawResponse = await res.json()
      const valid = res.ok && rawResponse?.status === 'success'

      return {
        valid,
        correctedName: method === 'correctName' && valid ? rawResponse.data : undefined,
        taxInfo: method === 'fullTaxaInfo' && valid ? rawResponse.data : undefined,
        source: rawResponse?.source,
        error: valid ? undefined : rawResponse?.error ?? `HTTP ${res.status}`,
        rawResponse,
      }
    } catch (error) {
      const err = error as Error
      const message = err.name === 'AbortError'
        ? `Taxonomic validation timed out after ${REQUEST_TIMEOUT_MS}ms`
        : err.message

      return {
        valid: false,
        correctedName: undefined,
        taxInfo: undefined,
        source: undefined,
        error: message,
        rawResponse: { error: message },
      }
    } finally {
      clearTimeout(timeout)
    }
  },
})
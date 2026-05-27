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
  execute: async ({ taxa, method = 'correctName', family }) => {
    const res = await fetch(`${baseUrl}/api/checknames`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taxa,
        method,
        family,
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
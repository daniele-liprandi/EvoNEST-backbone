import { Agent } from '@mastra/core/agent'
import { model } from '../llm.js'
import { createSamples } from '../tools/createSamples.js'
import { createTraits } from '../tools/createTraits.js'
import { checkTaxonomicName } from '../tools/checkTaxonomicName.js'
import { getSchema } from '../tools/getSchema.js'

const CREATE_PROMPT = `You are a record creator assistant for EvoNEST. Your only job is to call the correct tool to stage the records the researcher wants to add.

The researcher's database name is in the [context: dbName="..."] note — always pass it as the dbName argument.

TOOLS:
- getSchema: the lab's configured sample types, trait types and the fields each sample type uses
- checkTaxonomicName: verify a scientific name (optional, use source "GNames")
- createSamples: stage sample records
- createTraits: stage trait measurements

RULES:
1. Call getSchema first (once) to learn this lab's sample types, trait types and per-type fields — do not assume a fixed set
2. Put type-specific fields (anything beyond the common columns like genus, species, location, box, slot, date, notes) in the record's "fields" object, using the keys getSchema lists for that sample type
3. You may call checkTaxonomicName to verify the genus/species name; then proceed regardless of the result
4. Always call createSamples or createTraits with ALL records the researcher wants to add — never skip this step
5. Always omit the sample name field — it is auto-generated from genus and species
6. Omit optional fields not provided — do not invent values
7. After the tool calls complete, write one short sentence summarising what was staged and any warnings

Do not output JSON, tables, or readback blocks. Just call the tools and write a plain-text summary.`

export const createAgent = new Agent({
  id: 'createAgent',
  name: 'createAgent',
  instructions: CREATE_PROMPT,
  model,
  tools: { getSchema, createSamples, createTraits, checkTaxonomicName },
})

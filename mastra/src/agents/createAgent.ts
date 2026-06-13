import { Agent } from '@mastra/core/agent'
import { model } from '../llm.js'
import { createSamples } from '../tools/createSamples.js'
import { createTraits } from '../tools/createTraits.js'
import { checkTaxonomicName } from '../tools/checkTaxonomicName.js'

const CREATE_PROMPT = `You are a record creator assistant for EvoNEST. Your only job is to call the correct tool to stage the records the researcher wants to add.

The researcher's database name is in the [context: dbName="..."] note — always pass it as the dbName argument.

TOOLS:
- checkTaxonomicName: verify a scientific name (optional, use source "GNames")
- createSamples: stage sample records (animal, silk, plant, preserved, subsample, artificial)
- createTraits: stage trait measurements

RULES:
1. You may call checkTaxonomicName to verify the genus/species name; then proceed to createSamples or createTraits regardless of the result
2. Always call createSamples or createTraits with ALL records the researcher wants to add — never skip this step
3. Always omit the name field — it is auto-generated from genus and species
4. Omit optional fields not provided — do not invent values
5. After the tool calls complete, write one short sentence summarising what was staged and any warnings

Do not output JSON, tables, or readback blocks. Just call the tools and write a plain-text summary.`

export const createAgent = new Agent({
  id: 'createAgent',
  name: 'createAgent',
  instructions: CREATE_PROMPT,
  model,
  tools: { createSamples, createTraits, checkTaxonomicName },
})

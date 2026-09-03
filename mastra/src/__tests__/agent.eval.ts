import { describe, it, expect } from 'vitest'
import { runEvals } from '@mastra/core/evals'
import { createToolCallAccuracyScorerCode } from '@mastra/evals/scorers/prebuilt'
import { evonestAgent } from '../agent.js'

function withContext(message: string): string {
  return `[context: dbName="test"]\n\n${message}`
}

function toolTrajectory(targetResult: any): string {
  // Tool calls live in response message content parts
  const messages: any[] = targetResult?.response?.messages ?? []
  const names: string[] = []
  for (const msg of messages) {
    for (const part of msg?.content?.parts ?? []) {
      if (part?.type === 'tool-invocation' && part?.toolInvocation?.toolName) {
        names.push(part.toolInvocation.toolName)
      }
    }
  }
  // Also check steps (Vercel AI SDK format)
  for (const step of targetResult?.steps ?? []) {
    for (const tc of step.toolCalls ?? []) {
      if (tc.toolName && !names.includes(tc.toolName)) names.push(tc.toolName)
    }
  }
  return names.length ? names.join(' → ') : '(no tools called)'
}

describe('evonestAgent create routing', () => {
  it('calls createSamples for a create intent', async () => {
    const scorer = createToolCallAccuracyScorerCode({ expectedTool: 'createSamples' })

    const result = await runEvals({
      target: evonestAgent,
      data: [
        { input: withContext('I collected two samples of Tegenaria ferruginea in Greifswald today') },
        { input: withContext('Add 3 silk samples of Araneus diadematus collected last week in Berlin') },
      ],
      scorers: [scorer],
      onItemComplete: ({ item, targetResult, scorerResults }) => {
        const msg = typeof item.input === 'string' ? item.input.split('\n\n')[1] : ''
        console.log(`\n  input:   ${msg}`)
        console.log(`  tools:   ${toolTrajectory(targetResult)}`)
        const score = (scorerResults as any)?.[0]?.score ?? scorerResults
        console.log(`  score:   ${JSON.stringify(score)}`)
      },
    })

    expect(Object.values(result.scores).every(s => s === 1)).toBe(true)
  })
})

describe('evonestAgent query routing', () => {
  it('calls queryData, not a create tool, when a lookup uses a creation verb', async () => {
    const scorer = createToolCallAccuracyScorerCode({ expectedTool: 'queryData' })

    const result = await runEvals({
      target: evonestAgent,
      data: [
        { input: withContext('How many samples did I record last week?') },
        { input: withContext('Show me the silk samples I logged this month') },
      ],
      scorers: [scorer],
      onItemComplete: ({ item, targetResult, scorerResults }) => {
        const msg = typeof item.input === 'string' ? item.input.split('\n\n')[1] : ''
        console.log(`\n  input:   ${msg}`)
        console.log(`  tools:   ${toolTrajectory(targetResult)}`)
        const score = (scorerResults as any)?.[0]?.score ?? scorerResults
        console.log(`  score:   ${JSON.stringify(score)}`)
      },
    })

    expect(Object.values(result.scores).every(s => s === 1)).toBe(true)
  })
})

describe('evonestAgent tool routing', () => {
  it('calls checkTaxonomicName for an explicit name lookup', async () => {
    const scorer = createToolCallAccuracyScorerCode({ expectedTool: 'checkTaxonomicName' })

    const result = await runEvals({
      target: evonestAgent,
      data: [
        { input: withContext('What is the correct scientific name for Tegenaria gigantea?') },
      ],
      scorers: [scorer],
      onItemComplete: ({ item, targetResult, scorerResults }) => {
        const msg = typeof item.input === 'string' ? item.input.split('\n\n')[1] : ''
        console.log(`\n  input:   ${msg}`)
        console.log(`  tools:   ${toolTrajectory(targetResult)}`)
        const score = (scorerResults as any)?.[0]?.score ?? scorerResults
        console.log(`  score:   ${JSON.stringify(score)}`)
      },
    })

    expect(Object.values(result.scores).every(s => s === 1)).toBe(true)
  })
})

import { defineConfig } from 'vitest/config'
import { existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  return dotenv.parse(readFileSync(path)) as Record<string, string>
}

// `*.eval.ts` files drive a live LLM and are slow; they run only through
// `npm run test:eval` (VITEST_EVAL=1), never in the default unit run or CI.
const runEvals = process.env.VITEST_EVAL === '1'

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,mts}', ...(runEvals ? ['src/**/*.eval.{ts,mts}'] : [])],
    env: {
      ...parseEnvFile(resolve(__dirname, '../.env.development')),
      ...parseEnvFile(resolve(__dirname, '../.env.local')),
    },
    testTimeout: 60_000,
    reporter: 'verbose',
  },
})

import type { Config } from 'jest'

import nextJest from 'next/jest.js'
 
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})
 
// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.js', '**/*.test.ts', '**/*.test.tsx'],
  // Never pick up compiled output, vendored deps, or the mastra sub-package
  // (which has its own vitest runner — `cd mastra && npm test`).
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.next/', '<rootDir>/mastra/'],
  verbose: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // The mongodb driver's ESM bson build breaks under jest's CJS runtime;
    // force the CommonJS entry.
    '^bson$': '<rootDir>/node_modules/bson/lib/bson.cjs',
  },
  testTimeout: 10000,
  setupFiles: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)

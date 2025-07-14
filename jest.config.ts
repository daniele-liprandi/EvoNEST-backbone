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
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/*.test.js', '**/*.test.ts', '**/*.test.tsx'],
    verbose: true,
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    // Increasing timeout since MongoDB Memory Server might take longer to start
    testTimeout: 10000
};

export default createJestConfig(config)

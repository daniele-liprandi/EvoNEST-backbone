/**
 * Jest Configuration for Experiment Parsers
 * 
 * Specific configuration for testing the experiment parser system
 */

module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '<rootDir>/src/utils/experiment-parsers/__tests__/**/*.test.js'
    ],
    collectCoverageFrom: [
        'src/utils/experiment-parsers/**/*.js',
        '!src/utils/experiment-parsers/__tests__/**',
        '!src/utils/experiment-parsers/TemplateExperimentParser.js'
    ],
    coverageDirectory: 'coverage/experiment-parsers',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: [
        '<rootDir>/src/utils/experiment-parsers/__tests__/setup.js'
    ],
    testTimeout: 10000,
    verbose: true,
    // Module path mapping for easier imports
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1'
    }
};

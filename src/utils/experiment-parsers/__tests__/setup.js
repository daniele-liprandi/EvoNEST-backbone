/**
 * Test Setup
 * 
 * Global setup and configuration for parser tests
 */

// Mock console methods to reduce noise during testing
global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Restore console for specific tests that need to verify logging
global.restoreConsole = () => {
    global.console = {
        ...global.console,
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
    };
};

// Common test timeout for async operations
jest.setTimeout(10000);

// Global test utilities
global.createMockDate = (dateString = '2024-01-15T10:30:00.000Z') => {
    const mockDate = new Date(dateString);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    Date.now = jest.fn(() => mockDate.getTime());
    return mockDate;
};

global.restoreDate = () => {
    global.Date.mockRestore();
};

// Helper for testing async operations
global.expectAsyncError = async (asyncFn, expectedError) => {
    let error;
    try {
        await asyncFn();
    } catch (e) {
        error = e;
    }
    expect(error).toBeDefined();
    if (expectedError) {
        expect(error.message).toContain(expectedError);
    }
};

// Setup for each test
beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
    // Restore any mocked functions
    if (global.Date.mockRestore) {
        global.Date.mockRestore();
    }
});

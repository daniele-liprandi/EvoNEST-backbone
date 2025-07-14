/**
 * Base Experiment Parser Tests
 * 
 * Tests for the BaseExperimentParser class functionality
 */

import { BaseExperimentParser } from '../BaseExperimentParser.js';

// Mock parser for testing base functionality
class MockParser extends BaseExperimentParser {
    constructor() {
        super();
        this.supportedTypes = ['mock_test'];
    }

    async process(experimentData, fileData, context) {
        return {
            success: true,
            traits: [],
            experimentUpdates: {},
            logMessage: 'Mock processing complete'
        };
    }
}

describe('BaseExperimentParser', () => {
    let parser;

    beforeEach(() => {
        parser = new MockParser();
    });

    describe('Constructor', () => {
        test('should initialize with correct properties', () => {
            expect(parser.name).toBe('MockParser');
            expect(parser.supportedTypes).toEqual(['mock_test']);
            expect(parser.version).toBe('1.0.0');
        });
    });

    describe('validate', () => {
        test('should pass validation with valid data', () => {
            const experimentData = {
                sampleId: 'sample123',
                responsible: 'user456'
            };
            const fileData = { includedData: {} };

            const result = parser.validate(experimentData, fileData);
            
            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should fail validation without experiment data', () => {
            const result = parser.validate(null, { includedData: {} });
            
            expect(result.success).toBe(false);
            expect(result.errors).toContain('Experiment data is required');
        });

        test('should fail validation without file data', () => {
            const experimentData = {
                sampleId: 'sample123',
                responsible: 'user456'
            };

            const result = parser.validate(experimentData, null);
            
            expect(result.success).toBe(false);
            expect(result.errors).toContain('File data is required');
        });

        test('should fail validation without sample ID', () => {
            const experimentData = { responsible: 'user456' };
            const fileData = { includedData: {} };

            const result = parser.validate(experimentData, fileData);
            
            expect(result.success).toBe(false);
            expect(result.errors).toContain('Sample ID is required');
        });

        test('should fail validation without responsible person', () => {
            const experimentData = { sampleId: 'sample123' };
            const fileData = { includedData: {} };

            const result = parser.validate(experimentData, fileData);
            
            expect(result.success).toBe(false);
            expect(result.errors).toContain('Responsible person is required');
        });
    });

    describe('createTrait', () => {
        test('should create trait with correct structure', () => {
            const traitData = {
                measurement: 123.45,
                type: 'test_measurement',
                unit: 'units'
            };
            const experimentData = {
                responsible: 'user456',
                sampleId: 'sample123',
                name: 'Test Experiment',
                date: '2024-01-01T00:00:00.000Z'
            };

            const trait = parser.createTrait(traitData, experimentData);

            expect(trait.method).toBe('create');
            expect(trait.responsible).toBe('user456');
            expect(trait.sampleId).toBe('sample123');
            expect(trait.experimentId).toBe('Test Experiment');
            expect(trait.measurement).toBe(123.45);
            expect(trait.type).toBe('test_measurement');
            expect(trait.unit).toBe('units');
            expect(trait.date).toBe('2024-01-01T00:00:00.000Z');
            expect(trait.recentChangeDate).toBeDefined();
            expect(trait.logbook).toBeDefined();
            expect(Array.isArray(trait.logbook)).toBe(true);
        });

        test('should use current timestamp when no date provided', () => {
            const traitData = { measurement: 123, type: 'test', unit: 'u' };
            const experimentData = {
                responsible: 'user456',
                sampleId: 'sample123',
                name: 'Test'
            };

            const trait = parser.createTrait(traitData, experimentData);

            expect(trait.date).toBeDefined();
            expect(new Date(trait.date)).toBeInstanceOf(Date);
        });
    });

    describe('createExperimentUpdate', () => {
        test('should create update object with correct structure', () => {
            const updates = { testValue: 123 };
            const logMessage = 'Test update';

            const updateObject = parser.createExperimentUpdate(updates, logMessage);

            expect(updateObject.$set).toBeDefined();
            expect(updateObject.$set.testValue).toBe(123);
            expect(updateObject.$set.recentChangeDate).toBeDefined();
            expect(updateObject.$push).toBeDefined();
            expect(updateObject.$push.logbook).toBeDefined();
            expect(Array.isArray(updateObject.$push.logbook)).toBe(true);
            expect(updateObject.$push.logbook[1]).toBe('Test update');
        });
    });

    describe('extractValue', () => {
        test('should extract maximum value', () => {
            const data = [1, 5, 3, 9, 2];
            expect(parser.extractValue(data, 'max')).toBe(9);
        });

        test('should extract minimum value', () => {
            const data = [1, 5, 3, 9, 2];
            expect(parser.extractValue(data, 'min')).toBe(1);
        });

        test('should extract average value', () => {
            const data = [2, 4, 6];
            expect(parser.extractValue(data, 'avg')).toBe(4);
        });

        test('should extract sum value', () => {
            const data = [1, 2, 3, 4];
            expect(parser.extractValue(data, 'sum')).toBe(10);
        });

        test('should return null for empty array', () => {
            expect(parser.extractValue([], 'max')).toBeNull();
        });

        test('should return null for non-array input', () => {
            expect(parser.extractValue('not an array', 'max')).toBeNull();
        });

        test('should filter out non-numeric values', () => {
            const data = [1, 'two', 3, null, 5, undefined, NaN];
            expect(parser.extractValue(data, 'max')).toBe(5);
        });

        test('should default to max operation', () => {
            const data = [1, 5, 3];
            expect(parser.extractValue(data)).toBe(5);
        });
    });

    describe('checkRequiredFields', () => {
        test('should pass with all required fields present', () => {
            const data = { field1: 'value1', field2: 'value2' };
            const required = ['field1', 'field2'];

            const result = parser.checkRequiredFields(data, required);

            expect(result.success).toBe(true);
            expect(result.missing).toHaveLength(0);
        });

        test('should fail with missing fields', () => {
            const data = { field1: 'value1' };
            const required = ['field1', 'field2', 'field3'];

            const result = parser.checkRequiredFields(data, required);

            expect(result.success).toBe(false);
            expect(result.missing).toEqual(['field2', 'field3']);
        });

        test('should detect null and undefined as missing', () => {
            const data = { field1: null, field2: undefined, field3: 'value' };
            const required = ['field1', 'field2', 'field3'];

            const result = parser.checkRequiredFields(data, required);

            expect(result.success).toBe(false);
            expect(result.missing).toEqual(['field1', 'field2']);
        });
    });

    describe('log', () => {
        test('should log messages with different levels', () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            parser.log('Info message', 'info');
            parser.log('Warning message', 'warn');
            parser.log('Error message', 'error');

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('MockParser: Info message'));
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('MockParser: Warning message'));
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('MockParser: Error message'));

            consoleSpy.mockRestore();
            consoleWarnSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        test('should default to info level', () => {
            const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

            parser.log('Default message');

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('MockParser: Default message'));

            consoleSpy.mockRestore();
        });
    });

    describe('process', () => {
        test('should throw error if not implemented', async () => {
            const baseParser = new BaseExperimentParser();
            
            await expect(baseParser.process({}, {}, {}))
                .rejects.toThrow('Process method must be implemented by BaseExperimentParser');
        });
    });
});

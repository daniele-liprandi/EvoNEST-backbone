/**
 * Mechanical Test Parser Tests
 * 
 * Tests for the MechanicalTestParser class
 */

import { MechanicalTestParser } from '../MechanicalTestParser.js';
import fs from 'fs/promises';
import path from 'path';

describe('MechanicalTestParser', () => {
    let parser;
    let mechanicalTestData;
    let invalidData;

    beforeAll(async () => {
        // Load test data files
        const testDataDir = path.join(__dirname, 'test-data');
        const mechanicalDataFile = path.join(testDataDir, 'mechanical-test-data.json');
        const invalidDataFile = path.join(testDataDir, 'invalid-data.json');

        mechanicalTestData = JSON.parse(await fs.readFile(mechanicalDataFile, 'utf8'));
        invalidData = JSON.parse(await fs.readFile(invalidDataFile, 'utf8'));
    });

    beforeEach(() => {
        parser = new MechanicalTestParser();
    });

    describe('Constructor', () => {
        test('should initialize with correct properties', () => {
            expect(parser.name).toBe('MechanicalTestParser');
            expect(parser.supportedTypes).toEqual(['mechanical_test']);
            expect(parser.version).toBe('1.0.0');
        });
    });

    describe('validate', () => {
        test('should pass validation with valid mechanical test data', () => {
            const experimentData = {
                sampleId: 'sample123',
                responsible: 'user456'
            };

            const result = parser.validate(experimentData, mechanicalTestData);

            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should fail validation without includedData', () => {
            const experimentData = {
                sampleId: 'sample123',
                responsible: 'user456'
            };
            const fileData = {};

            const result = parser.validate(experimentData, fileData);

            expect(result.success).toBe(false);
            expect(result.errors).toContain('Raw measurement data (includedData) is required for mechanical tests');
        });

        test('should fail validation without LoadOnSpecimen data', () => {
            const experimentData = {
                sampleId: 'sample123',
                responsible: 'user456'
            };
            const fileData = { includedData: {} };

            const result = parser.validate(experimentData, fileData);

            expect(result.success).toBe(false);
            expect(result.errors).toContain('LoadOnSpecimen data is required for mechanical tests');
        });
    });

    describe('extractLoadAtBreak', () => {
        test('should extract maximum load value', () => {
            const result = parser.extractLoadAtBreak(mechanicalTestData);
            
            // From our test data, the maximum load should be 123.1
            expect(result).toBe(123.1);
        });

        test('should return null for missing LoadOnSpecimen data', () => {
            const fileData = { includedData: {} };
            
            const result = parser.extractLoadAtBreak(fileData);
            
            expect(result).toBeNull();
        });

        test('should return null for non-array LoadOnSpecimen data', () => {
            const fileData = {
                includedData: {
                    LoadOnSpecimen: "not an array"
                }
            };
            
            const result = parser.extractLoadAtBreak(fileData);
            
            expect(result).toBeNull();
        });

        test('should handle empty array', () => {
            const fileData = {
                includedData: {
                    LoadOnSpecimen: []
                }
            };
            
            const result = parser.extractLoadAtBreak(fileData);
            
            expect(result).toBeNull();
        });
    });

    describe('extractAdditionalProperties', () => {
        test('should extract displacement at break', () => {
            const properties = parser.extractAdditionalProperties(mechanicalTestData);
            
            const displacementProperty = properties.find(p => p.type === 'displacementAtBreak');
            expect(displacementProperty).toBeDefined();
            expect(displacementProperty.measurement).toBe(3.9); // Max displacement from test data
            expect(displacementProperty.unit).toBe('mm');
        });

        test('should calculate strain when both load and displacement are available', () => {
            const properties = parser.extractAdditionalProperties(mechanicalTestData);
            
            const strainProperty = properties.find(p => p.type === 'maxStrain');
            expect(strainProperty).toBeDefined();
            expect(strainProperty.unit).toBe('%');
            expect(typeof strainProperty.measurement).toBe('number');
        });

        test('should return empty array for missing data', () => {
            const fileData = { includedData: {} };
            
            const properties = parser.extractAdditionalProperties(fileData);
            
            expect(properties).toEqual([]);
        });
    });

    describe('calculateStrain', () => {
        test('should calculate strain correctly', () => {
            const loadData = [0, 50, 100, 75, 25, 0];
            const displacementData = [0, 1, 2, 2.5, 3, 3.5];
            
            const strain = parser.calculateStrain(loadData, displacementData);
            
            // Max load is 100 at index 2, displacement at that point is 2
            // Strain = (2 / 50) * 100 = 4%
            expect(strain).toBe(4);
        });

        test('should return null for mismatched array lengths', () => {
            const loadData = [1, 2, 3];
            const displacementData = [1, 2];
            
            const strain = parser.calculateStrain(loadData, displacementData);
            
            expect(strain).toBeNull();
        });

        test('should return null for non-array inputs', () => {
            const strain = parser.calculateStrain('not array', [1, 2, 3]);
            
            expect(strain).toBeNull();
        });
    });

    describe('process', () => {
        test('should process mechanical test data successfully', async () => {
            const experimentData = {
                name: 'Test Mechanical Experiment',
                type: 'tensile_test',
                sampleId: 'sample123',
                responsible: 'user456',
                date: '2024-01-01T00:00:00.000Z'
            };

            const context = {
                db: {},
                collections: {
                    experiments: {},
                    traits: {},
                    samples: {},
                    rawdata: {}
                }
            };

            const result = await parser.process(experimentData, mechanicalTestData, context);

            expect(result.success).toBe(true);
            expect(result.traits).toBeDefined();
            expect(result.traits.length).toBeGreaterThan(0);
            expect(result.experimentUpdates).toBeDefined();
            expect(result.experimentUpdates.loadAtBreak).toBe(123.1);
            expect(result.logMessage).toContain('Processed mechanical test data');

            // Check that loadAtBreak trait was created
            const loadAtBreakTrait = result.traits.find(t => t.type === 'loadAtBreak');
            expect(loadAtBreakTrait).toBeDefined();
            expect(loadAtBreakTrait.measurement).toBe(123.1);
            expect(loadAtBreakTrait.unit).toBe('N');
            expect(loadAtBreakTrait.equipment).toBe('tensile_test');
        });

        test('should handle validation errors gracefully', async () => {
            const experimentData = {}; // Missing required fields
            const context = {};

            const result = await parser.process(experimentData, mechanicalTestData, context);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Validation failed');
            expect(result.traits).toEqual([]);
            expect(result.experimentUpdates).toEqual({});
        });

        test('should handle missing load data gracefully', async () => {
            const experimentData = {
                name: 'Test Experiment',
                sampleId: 'sample123',
                responsible: 'user456'
            };

            const fileDataWithoutLoad = { 
                includedData: { 
                    DisplacementOnSpecimen: [1, 2, 3] 
                } 
            };

            const context = {};

            const result = await parser.process(experimentData, fileDataWithoutLoad, context);

            expect(result.success).toBe(false);
            expect(result.error).toContain('LoadOnSpecimen data is required');
        });

        test('should create multiple traits when additional properties are available', async () => {
            const experimentData = {
                name: 'Test Mechanical Experiment',
                type: 'tensile_test',
                sampleId: 'sample123',
                responsible: 'user456'
            };

            const context = {};

            const result = await parser.process(experimentData, mechanicalTestData, context);

            expect(result.success).toBe(true);
            expect(result.traits.length).toBeGreaterThan(1);

            // Should have loadAtBreak trait
            const loadAtBreakTrait = result.traits.find(t => t.type === 'loadAtBreak');
            expect(loadAtBreakTrait).toBeDefined();

            // Should have displacement trait
            const displacementTrait = result.traits.find(t => t.type === 'displacementAtBreak');
            expect(displacementTrait).toBeDefined();

            // Should have strain trait
            const strainTrait = result.traits.find(t => t.type === 'maxStrain');
            expect(strainTrait).toBeDefined();
        });
    });

    describe('Integration with test data', () => {
        test('should extract correct values from realistic test data', () => {
            // Test with our mechanical test data file
            const loadAtBreak = parser.extractLoadAtBreak(mechanicalTestData);
            expect(loadAtBreak).toBe(123.1);

            const properties = parser.extractAdditionalProperties(mechanicalTestData);
            expect(properties.length).toBeGreaterThan(0);

            const displacementProperty = properties.find(p => p.type === 'displacementAtBreak');
            expect(displacementProperty.measurement).toBe(3.9);
        });
    });
});

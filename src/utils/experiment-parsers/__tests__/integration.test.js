/**
 * Integration Tests
 * 
 * Tests for the complete experiment parser workflow
 */

import { processExperiment } from '../registry.js';
import fs from 'fs/promises';
import path from 'path';

describe('Experiment Parser Integration', () => {
    let mechanicalTestData;
    let imageAnalysisData;
    let spectroscopyData;

    beforeAll(async () => {
        // Load all test data files
        const testDataDir = path.join(__dirname, 'test-data');
        
        mechanicalTestData = JSON.parse(
            await fs.readFile(path.join(testDataDir, 'mechanical-test-data.json'), 'utf8')
        );
        imageAnalysisData = JSON.parse(
            await fs.readFile(path.join(testDataDir, 'image-analysis-data.json'), 'utf8')
        );
        spectroscopyData = JSON.parse(
            await fs.readFile(path.join(testDataDir, 'spectroscopy-data.json'), 'utf8')
        );
    });

    const createMockContext = () => ({
        db: {
            collection: jest.fn(() => ({
                insertOne: jest.fn(),
                updateOne: jest.fn(),
                findOne: jest.fn()
            }))
        },
        collections: {
            experiments: {
                insertOne: jest.fn(),
                updateOne: jest.fn()
            },
            traits: {
                insertOne: jest.fn(),
                findOne: jest.fn()
            },
            samples: {
                updateOne: jest.fn()
            },
            rawdata: {
                insertOne: jest.fn()
            }
        }
    });

    describe('Mechanical Test Integration', () => {
        test('should process complete mechanical test workflow', async () => {
            const experimentData = {
                name: 'Integration Test - Mechanical',
                type: 'tensile_test',
                sampleId: '64f8a1b2c3d4e5f6a7b8c9d0',
                responsible: '64f8a1b2c3d4e5f6a7b8c9d1',
                date: '2024-01-15T10:30:00.000Z',
                notes: 'Integration test for mechanical parser'
            };

            const context = createMockContext();

            const result = await processExperiment(
                'tensile_test',
                experimentData,
                mechanicalTestData,
                context
            );

            // Verify processing success
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();

            // Verify traits generation
            expect(result.traits).toBeDefined();
            expect(result.traits.length).toBeGreaterThan(0);

            // Verify specific traits
            const loadAtBreakTrait = result.traits.find(t => t.type === 'loadAtBreak');
            expect(loadAtBreakTrait).toBeDefined();
            expect(loadAtBreakTrait.measurement).toBe(123.1); // Max load from test data
            expect(loadAtBreakTrait.unit).toBe('N');
            expect(loadAtBreakTrait.equipment).toBe('tensile_test');
            expect(loadAtBreakTrait.sampleId).toBe(experimentData.sampleId);
            expect(loadAtBreakTrait.responsible).toBe(experimentData.responsible);
            expect(loadAtBreakTrait.experimentId).toBe(experimentData.name);

            // Verify displacement trait
            const displacementTrait = result.traits.find(t => t.type === 'displacementAtBreak');
            expect(displacementTrait).toBeDefined();
            expect(displacementTrait.measurement).toBe(3.9); // Max displacement from test data
            expect(displacementTrait.unit).toBe('mm');

            // Verify strain trait
            const strainTrait = result.traits.find(t => t.type === 'maxStrain');
            expect(strainTrait).toBeDefined();
            expect(strainTrait.unit).toBe('%');

            // Verify experiment updates
            expect(result.experimentUpdates).toBeDefined();
            expect(result.experimentUpdates.loadAtBreak).toBe(123.1);

            // Verify trait structure compliance
            result.traits.forEach(trait => {
                expect(trait.method).toBe('create');
                expect(trait.recentChangeDate).toBeDefined();
                expect(trait.logbook).toBeDefined();
                expect(Array.isArray(trait.logbook)).toBe(true);
                expect(trait.logbook[0]).toHaveLength(2); // [timestamp, message]
            });
        });

        test('should handle different mechanical test types', async () => {
            const testTypes = ['mechanical_test'];

            for (const type of testTypes) {
                const experimentData = {
                    name: `Integration Test - ${type}`,
                    type,
                    sampleId: '64f8a1b2c3d4e5f6a7b8c9d0',
                    responsible: '64f8a1b2c3d4e5f6a7b8c9d1'
                };

                const context = createMockContext();

                const result = await processExperiment(
                    type,
                    experimentData,
                    mechanicalTestData,
                    context
                );

                expect(result.success).toBe(true);
                expect(result.traits.length).toBeGreaterThan(0);
                
                const loadTrait = result.traits.find(t => t.type === 'loadAtBreak');
                expect(loadTrait).toBeDefined();
            }
        });
    });

    describe('Image Analysis Integration', () => {
        test('should process complete image analysis workflow', async () => {
            const experimentData = {
                name: 'Integration Test - Image Analysis',
                type: 'image_analysis',
                sampleId: '64f8a1b2c3d4e5f6a7b8c9d2',
                responsible: '64f8a1b2c3d4e5f6a7b8c9d3',
                date: '2024-01-15T14:45:00.000Z',
                notes: 'Integration test for image analysis parser'
            };

            const context = createMockContext();

            const result = await processExperiment(
                'image_analysis',
                experimentData,
                imageAnalysisData,
                context
            );

            // Verify processing success
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();

            // Verify traits generation
            expect(result.traits).toBeDefined();
            expect(result.traits.length).toBeGreaterThan(5); // area, perimeter, circularity + color traits

            // Verify morphometric traits
            const areaTrait = result.traits.find(t => t.type === 'area');
            expect(areaTrait).toBeDefined();
            expect(areaTrait.unit).toBe('mm²');
            expect(areaTrait.measurement).toBeCloseTo(126.4125, 2);

            const perimeterTrait = result.traits.find(t => t.type === 'perimeter');
            expect(perimeterTrait).toBeDefined();
            expect(perimeterTrait.unit).toBe('mm');
            expect(perimeterTrait.measurement).toBeCloseTo(45.55, 2);

            const circularityTrait = result.traits.find(t => t.type === 'circularity');
            expect(circularityTrait).toBeDefined();
            expect(circularityTrait.unit).toBe('ratio');
            expect(circularityTrait.measurement).toBeGreaterThan(0);
            expect(circularityTrait.measurement).toBeLessThanOrEqual(1);

            // Verify color traits
            const colorTypes = ['red_channel', 'green_channel', 'blue_channel', 'hue', 'saturation', 'brightness'];
            colorTypes.forEach(colorType => {
                const colorTrait = result.traits.find(t => t.type === colorType);
                expect(colorTrait).toBeDefined();
                expect(typeof colorTrait.measurement).toBe('number');
            });

            // Verify RGB values
            const redTrait = result.traits.find(t => t.type === 'red_channel');
            expect(redTrait.measurement).toBe(178);

            // Verify HSV values
            const hueTrait = result.traits.find(t => t.type === 'hue');
            expect(hueTrait.measurement).toBe(33);

            // Verify experiment updates
            expect(result.experimentUpdates).toBeDefined();
            expect(result.experimentUpdates.area).toBeCloseTo(126.4125, 2);
            expect(result.experimentUpdates.perimeter).toBeCloseTo(45.55, 2);
            expect(result.experimentUpdates.circularity).toBeDefined();
        });

        test('should handle different image analysis types', async () => {
            const testTypes = ['image_analysis'];

            for (const type of testTypes) {
                const experimentData = {
                    name: `Integration Test - ${type}`,
                    type,
                    sampleId: '64f8a1b2c3d4e5f6a7b8c9d2',
                    responsible: '64f8a1b2c3d4e5f6a7b8c9d3'
                };

                const context = createMockContext();

                const result = await processExperiment(
                    type,
                    experimentData,
                    imageAnalysisData,
                    context
                );

                expect(result.success).toBe(true);
                expect(result.traits.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Error Handling Integration', () => {
        test('should handle unsupported experiment types gracefully', async () => {
            const experimentData = {
                name: 'Unsupported Experiment',
                type: 'unsupported_type',
                sampleId: '64f8a1b2c3d4e5f6a7b8c9d0',
                responsible: '64f8a1b2c3d4e5f6a7b8c9d1'
            };

            const context = createMockContext();

            const result = await processExperiment(
                'unsupported_type',
                experimentData,
                mechanicalTestData,
                context
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('No parser available for experiment type: unsupported_type');
            expect(result.traits).toEqual([]);
            expect(result.experimentUpdates).toEqual({});
        });

        test('should handle invalid experiment data', async () => {
            const invalidExperimentData = {
                name: 'Invalid Experiment'
                // Missing required fields: sampleId, responsible
            };

            const context = createMockContext();

            const result = await processExperiment(
                'mechanical_test',
                invalidExperimentData,
                mechanicalTestData,
                context
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Validation failed');
            expect(result.traits).toEqual([]);
            expect(result.experimentUpdates).toEqual({});
        });

        test('should handle invalid file data', async () => {
            const experimentData = {
                name: 'Valid Experiment',
                type: 'mechanical_test',
                sampleId: '64f8a1b2c3d4e5f6a7b8c9d0',
                responsible: '64f8a1b2c3d4e5f6a7b8c9d1'
            };

            const invalidFileData = {
                includedData: {
                    // Missing LoadOnSpecimen for mechanical test
                    SomeOtherData: [1, 2, 3]
                }
            };

            const context = createMockContext();

            const result = await processExperiment(
                'mechanical_test',
                experimentData,
                invalidFileData,
                context
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('LoadOnSpecimen data is required');
            expect(result.traits).toEqual([]);
            expect(result.experimentUpdates).toEqual({});
        });
    });

    describe('Performance and Scalability', () => {
        test('should handle large datasets efficiently', async () => {
            // Create large dataset
            const largeDataset = {
                includedData: {
                    LoadOnSpecimen: new Array(10000).fill(0).map((_, i) => Math.sin(i / 100) * 100 + 50),
                    DisplacementOnSpecimen: new Array(10000).fill(0).map((_, i) => i * 0.001)
                }
            };

            const experimentData = {
                name: 'Large Dataset Test',
                type: 'mechanical_test',
                sampleId: '64f8a1b2c3d4e5f6a7b8c9d0',
                responsible: '64f8a1b2c3d4e5f6a7b8c9d1'
            };

            const context = createMockContext();

            const startTime = Date.now();
            const result = await processExperiment(
                'mechanical_test',
                experimentData,
                largeDataset,
                context
            );
            const endTime = Date.now();

            expect(result.success).toBe(true);
            expect(result.traits.length).toBeGreaterThan(0);
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        });

        test('should handle multiple concurrent processing requests', async () => {
            const experiments = Array.from({ length: 5 }, (_, i) => ({
                name: `Concurrent Test ${i}`,
                type: 'mechanical_test',
                sampleId: `sample${i}`,
                responsible: `user${i}`
            }));

            const context = createMockContext();

            const promises = experiments.map(exp =>
                processExperiment(exp.type, exp, mechanicalTestData, context)
            );

            const results = await Promise.all(promises);

            results.forEach((result, i) => {
                expect(result.success).toBe(true);
                expect(result.traits.length).toBeGreaterThan(0);
                
                const loadTrait = result.traits.find(t => t.type === 'loadAtBreak');
                expect(loadTrait.experimentId).toBe(`Concurrent Test ${i}`);
            });
        });
    });

    describe('Future Parser Support', () => {
        test('should indicate missing parser for spectroscopy data', async () => {
            const experimentData = {
                name: 'Future Spectroscopy Test',
                type: 'spectroscopy',
                sampleId: '64f8a1b2c3d4e5f6a7b8c9d0',
                responsible: '64f8a1b2c3d4e5f6a7b8c9d1'
            };

            const context = createMockContext();

            const result = await processExperiment(
                'spectroscopy',
                experimentData,
                spectroscopyData,
                context
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('No parser available for experiment type: spectroscopy');
            
            // This demonstrates how the system gracefully handles unsupported types
            // When a spectroscopy parser is added, this test should be updated
        });
    });
});

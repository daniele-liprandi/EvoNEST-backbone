/**
 * Registry Tests
 * 
 * Tests for the experiment parser registry system
 */

import { 
    getParser, 
    getRegisteredTypes, 
    hasParser,
    processExperiment,
    EXPERIMENT_PARSERS 
} from '../registry.js';
import { MechanicalTestParser } from '../MechanicalTestParser.js';
import { ImageAnalysisParser } from '../ImageAnalysisParser.js';

describe('Experiment Parser Registry', () => {
    describe('EXPERIMENT_PARSERS', () => {
        test('should contain expected parser mappings', () => {
            expect(EXPERIMENT_PARSERS).toBeDefined();
            expect(EXPERIMENT_PARSERS['mechanical_test']).toBe(MechanicalTestParser);
            expect(EXPERIMENT_PARSERS['image_analysis']).toBe(ImageAnalysisParser);
        });
    });

    describe('getParser', () => {
        test('should return correct parser for registered types', () => {
            expect(getParser('mechanical_test')).toBe(MechanicalTestParser);
            expect(getParser('image_analysis')).toBe(ImageAnalysisParser);
        });

        test('should return null for unregistered types', () => {
            expect(getParser('unknown_type')).toBeNull();
            expect(getParser('spectroscopy')).toBeNull();
            expect(getParser('')).toBeNull();
        });

        test('should handle null and undefined input', () => {
            expect(getParser(null)).toBeNull();
            expect(getParser(undefined)).toBeNull();
        });
    });

    describe('getRegisteredTypes', () => {
        test('should return array of all registered types', () => {
            const types = getRegisteredTypes();
            
            expect(Array.isArray(types)).toBe(true);
            expect(types).toContain('mechanical_test');
            expect(types).toContain('image_analysis');
        });

        test('should return types that have parsers', () => {
            const types = getRegisteredTypes();
            
            // All returned types should have parsers
            types.forEach(type => {
                expect(EXPERIMENT_PARSERS[type]).toBeDefined();
            });
        });
    });

    describe('hasParser', () => {
        test('should return true for registered types', () => {
            expect(hasParser('mechanical_test')).toBe(true);
            expect(hasParser('image_analysis')).toBe(true);
        });

        test('should return false for unregistered types', () => {
            expect(hasParser('unknown_type')).toBe(false);
            expect(hasParser('spectroscopy')).toBe(false);
            expect(hasParser('')).toBe(false);
        });

        test('should handle null and undefined input', () => {
            expect(hasParser(null)).toBe(false);
            expect(hasParser(undefined)).toBe(false);
        });
    });

    describe('processExperiment', () => {
        const mockExperimentData = {
            name: 'Test Experiment',
            type: 'mechanical_test',
            sampleId: 'sample123',
            responsible: 'user456'
        };

        const mockFileData = {
            includedData: {
                LoadOnSpecimen: [0, 50, 100, 75, 25, 0]
            }
        };

        const mockContext = {
            db: {},
            collections: {}
        };

        test('should process experiment with registered parser', async () => {
            const result = await processExperiment(
                'mechanical_test',
                mockExperimentData,
                mockFileData,
                mockContext
            );

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.traits).toBeDefined();
            expect(result.experimentUpdates).toBeDefined();
        });

        test('should handle unregistered experiment type', async () => {
            const result = await processExperiment(
                'unknown_type',
                mockExperimentData,
                mockFileData,
                mockContext
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('No parser available for experiment type: unknown_type');
            expect(result.traits).toEqual([]);
            expect(result.experimentUpdates).toEqual({});
        });

        test('should handle parser instantiation errors', async () => {
            // Mock a parser that throws error during instantiation
            const originalParser = EXPERIMENT_PARSERS['mechanical_test'];
            EXPERIMENT_PARSERS['mechanical_test'] = function() {
                throw new Error('Instantiation error');
            };

            const result = await processExperiment(
                'mechanical_test',
                mockExperimentData,
                mockFileData,
                mockContext
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Instantiation error');
            expect(result.traits).toEqual([]);
            expect(result.experimentUpdates).toEqual({});

            // Restore original parser
            EXPERIMENT_PARSERS['mechanical_test'] = originalParser;
        });

        test('should handle parser processing errors', async () => {
            // Create a mock parser that throws during processing
            class ErrorParser {
                async process() {
                    throw new Error('Processing error');
                }
            }

            const originalParser = EXPERIMENT_PARSERS['mechanical_test'];
            EXPERIMENT_PARSERS['mechanical_test'] = ErrorParser;

            const result = await processExperiment(
                'mechanical_test',
                mockExperimentData,
                mockFileData,
                mockContext
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Processing error');
            expect(result.traits).toEqual([]);
            expect(result.experimentUpdates).toEqual({});

            // Restore original parser
            EXPERIMENT_PARSERS['mechanical_test'] = originalParser;
        });

        test('should process image analysis experiments', async () => {
            const imageExperimentData = {
                name: 'Image Test',
                type: 'image_analysis',
                sampleId: 'sample123',
                responsible: 'user456'
            };

            const imageFileData = {
                includedData: {
                    AreaMeasurements: [100, 101, 99],
                    PerimeterMeasurements: [35, 36, 34]
                }
            };

            const result = await processExperiment(
                'image_analysis',
                imageExperimentData,
                imageFileData,
                mockContext
            );

            expect(result.success).toBe(true);
            expect(result.traits).toBeDefined();
            expect(result.traits.length).toBeGreaterThan(0);
            
            // Should contain area and perimeter traits
            const areaTraits = result.traits.filter(t => t.type === 'area');
            expect(areaTraits.length).toBe(1);
        });

        test('should handle multiple experiment types with same parser', async () => {
            const types = ['mechanical_test'];
            
            for (const type of types) {
                const result = await processExperiment(
                    type,
                    { ...mockExperimentData, type },
                    mockFileData,
                    mockContext
                );

                expect(result.success).toBe(true);
                expect(result.traits).toBeDefined();
            }
        });
    });

    describe('Registry consistency', () => {
        test('should have parsers for all registered types', () => {
            const types = getRegisteredTypes();
            
            types.forEach(type => {
                expect(hasParser(type)).toBe(true);
                expect(getParser(type)).not.toBeNull();
            });
        });

        test('should have consistent type checking', () => {
            Object.keys(EXPERIMENT_PARSERS).forEach(type => {
                expect(hasParser(type)).toBe(true);
                expect(getParser(type)).not.toBeNull();
                expect(getRegisteredTypes()).toContain(type);
            });
        });
    });

    describe('Parser class verification', () => {
        test('should instantiate parsers correctly', () => {
            const mechanicalParser = new MechanicalTestParser();
            expect(mechanicalParser.supportedTypes).toContain('mechanical_test');

            const imageParser = new ImageAnalysisParser();
            expect(imageParser.supportedTypes).toContain('image_analysis');
        });

        test('should have process method on all parsers', async () => {
            const types = getRegisteredTypes();
            
            for (const type of types) {
                const ParserClass = getParser(type);
                const parser = new ParserClass();
                
                expect(typeof parser.process).toBe('function');
            }
        });
    });
});

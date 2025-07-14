/**
 * Image Analysis Parser Tests
 * 
 * Tests for the ImageAnalysisParser class
 */

import { ImageAnalysisParser } from '../ImageAnalysisParser.js';
import fs from 'fs/promises';
import path from 'path';

describe('ImageAnalysisParser', () => {
    let parser;
    let imageAnalysisData;
    let invalidData;

    beforeAll(async () => {
        // Load test data files
        const testDataDir = path.join(__dirname, 'test-data');
        const imageDataFile = path.join(testDataDir, 'image-analysis-data.json');
        const invalidDataFile = path.join(testDataDir, 'invalid-data.json');

        imageAnalysisData = JSON.parse(await fs.readFile(imageDataFile, 'utf8'));
        invalidData = JSON.parse(await fs.readFile(invalidDataFile, 'utf8'));
    });

    beforeEach(() => {
        parser = new ImageAnalysisParser();
    });

    describe('Constructor', () => {
        test('should initialize with correct properties', () => {
            expect(parser.name).toBe('ImageAnalysisParser');
            expect(parser.supportedTypes).toEqual(['image_analysis']);
            expect(parser.version).toBe('1.0.0');
        });
    });

    describe('validate', () => {
        test('should pass validation with valid image analysis data', () => {
            const experimentData = {
                sampleId: 'sample123',
                responsible: 'user456'
            };

            const result = parser.validate(experimentData, imageAnalysisData);

            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should fail validation without any measurement data', () => {
            const experimentData = {
                sampleId: 'sample123',
                responsible: 'user456'
            };
            const fileData = { includedData: {} };

            const result = parser.validate(experimentData, fileData);

            expect(result.success).toBe(false);
            expect(result.errors).toContain('At least one measurement type (area, perimeter, or color) is required');
        });

        test('should pass validation with only area measurements', () => {
            const experimentData = {
                sampleId: 'sample123',
                responsible: 'user456'
            };
            const fileData = {
                includedData: {
                    AreaMeasurements: [100, 101, 99]
                }
            };

            const result = parser.validate(experimentData, fileData);

            expect(result.success).toBe(true);
        });

        test('should pass validation with only color data', () => {
            const experimentData = {
                sampleId: 'sample123',
                responsible: 'user456'
            };
            const fileData = {
                includedData: {
                    ColorData: { RGB: { R: 255, G: 0, B: 0 } }
                }
            };

            const result = parser.validate(experimentData, fileData);

            expect(result.success).toBe(true);
        });
    });

    describe('extractArea', () => {
        test('should extract average area from multiple measurements', () => {
            const result = parser.extractArea(imageAnalysisData);
            
            // Calculate expected average: (125.6 + 128.3 + 124.9 + 127.1 + 126.8 + 125.2 + 127.4 + 126.0) / 8
            const expectedAverage = 126.4125;
            expect(result).toBeCloseTo(expectedAverage, 2);
        });

        test('should handle single area measurement', () => {
            const fileData = {
                includedData: {
                    AreaMeasurements: 100.5
                }
            };
            
            const result = parser.extractArea(fileData);
            
            expect(result).toBe(100.5);
        });

        test('should return null for missing area data', () => {
            const fileData = { includedData: {} };
            
            const result = parser.extractArea(fileData);
            
            expect(result).toBeNull();
        });

        test('should return null for non-numeric area data', () => {
            const fileData = {
                includedData: {
                    AreaMeasurements: "not a number"
                }
            };
            
            const result = parser.extractArea(fileData);
            
            expect(result).toBeNull();
        });
    });

    describe('extractPerimeter', () => {
        test('should extract average perimeter from multiple measurements', () => {
            const result = parser.extractPerimeter(imageAnalysisData);
            
            // Calculate expected average: (45.2 + 46.1 + 44.8 + 45.7 + 45.9 + 44.9 + 46.3 + 45.5) / 8
            const expectedAverage = 45.55;
            expect(result).toBeCloseTo(expectedAverage, 2);
        });

        test('should handle single perimeter measurement', () => {
            const fileData = {
                includedData: {
                    PerimeterMeasurements: 50.0
                }
            };
            
            const result = parser.extractPerimeter(fileData);
            
            expect(result).toBe(50.0);
        });

        test('should return null for missing perimeter data', () => {
            const fileData = { includedData: {} };
            
            const result = parser.extractPerimeter(fileData);
            
            expect(result).toBeNull();
        });
    });

    describe('calculateCircularity', () => {
        test('should calculate circularity correctly', () => {
            const area = 100; // Area in square units
            const perimeter = 35.45; // Perimeter that gives circularity ≈ 1 for a circle
            
            const result = parser.calculateCircularity(area, perimeter);
            
            // Circularity = 4π × Area / Perimeter²
            const expected = (4 * Math.PI * area) / (perimeter * perimeter);
            expect(result).toBeCloseTo(expected, 4);
        });

        test('should return null for zero or negative area', () => {
            expect(parser.calculateCircularity(0, 10)).toBeNull();
            expect(parser.calculateCircularity(-5, 10)).toBeNull();
        });

        test('should return null for zero or negative perimeter', () => {
            expect(parser.calculateCircularity(100, 0)).toBeNull();
            expect(parser.calculateCircularity(100, -5)).toBeNull();
        });

        test('should return value between 0 and 1 for typical shapes', () => {
            // Square: area = 100, perimeter = 40
            const squareCircularity = parser.calculateCircularity(100, 40);
            expect(squareCircularity).toBeGreaterThan(0);
            expect(squareCircularity).toBeLessThan(1);
            
            // Circle should be closer to 1
            const radius = Math.sqrt(100 / Math.PI);
            const circlePerimeter = 2 * Math.PI * radius;
            const circleCircularity = parser.calculateCircularity(100, circlePerimeter);
            expect(circleCircularity).toBeCloseTo(1, 2);
        });
    });

    describe('extractColorData', () => {
        test('should extract RGB color data', () => {
            const colorTraits = parser.extractColorData(imageAnalysisData);
            
            const redTrait = colorTraits.find(t => t.type === 'red_channel');
            const greenTrait = colorTraits.find(t => t.type === 'green_channel');
            const blueTrait = colorTraits.find(t => t.type === 'blue_channel');

            expect(redTrait).toBeDefined();
            expect(redTrait.measurement).toBe(178);
            expect(redTrait.unit).toBe('intensity');

            expect(greenTrait).toBeDefined();
            expect(greenTrait.measurement).toBe(142);

            expect(blueTrait).toBeDefined();
            expect(blueTrait.measurement).toBe(98);
        });

        test('should extract HSV color data', () => {
            const colorTraits = parser.extractColorData(imageAnalysisData);
            
            const hueTrait = colorTraits.find(t => t.type === 'hue');
            const saturationTrait = colorTraits.find(t => t.type === 'saturation');
            const brightnessTrait = colorTraits.find(t => t.type === 'brightness');

            expect(hueTrait).toBeDefined();
            expect(hueTrait.measurement).toBe(33);
            expect(hueTrait.unit).toBe('degrees');

            expect(saturationTrait).toBeDefined();
            expect(saturationTrait.measurement).toBe(45);
            expect(saturationTrait.unit).toBe('percentage');

            expect(brightnessTrait).toBeDefined();
            expect(brightnessTrait.measurement).toBe(70);
            expect(brightnessTrait.unit).toBe('percentage');
        });

        test('should return empty array for missing color data', () => {
            const fileData = { includedData: {} };
            
            const colorTraits = parser.extractColorData(fileData);
            
            expect(colorTraits).toEqual([]);
        });

        test('should handle partial color data', () => {
            const fileData = {
                includedData: {
                    ColorData: {
                        RGB: { R: 255, G: 128, B: 64 }
                        // No HSV data
                    }
                }
            };
            
            const colorTraits = parser.extractColorData(fileData);
            
            expect(colorTraits).toHaveLength(3); // Only RGB traits
            expect(colorTraits.find(t => t.type === 'red_channel')).toBeDefined();
            expect(colorTraits.find(t => t.type === 'hue')).toBeUndefined();
        });
    });

    describe('process', () => {
        test('should process image analysis data successfully', async () => {
            const experimentData = {
                name: 'Test Image Analysis',
                type: 'image_analysis',
                sampleId: 'sample123',
                responsible: 'user456',
                date: '2024-01-01T00:00:00.000Z'
            };

            const context = {
                db: {},
                collections: {}
            };

            const result = await parser.process(experimentData, imageAnalysisData, context);

            expect(result.success).toBe(true);
            expect(result.traits).toBeDefined();
            expect(result.traits.length).toBeGreaterThan(5); // area, perimeter, circularity, + color traits
            expect(result.experimentUpdates).toBeDefined();
            expect(result.logMessage).toContain('Processed image analysis data');

            // Check specific traits
            const areaTrait = result.traits.find(t => t.type === 'area');
            expect(areaTrait).toBeDefined();
            expect(areaTrait.unit).toBe('mm²');

            const perimeterTrait = result.traits.find(t => t.type === 'perimeter');
            expect(perimeterTrait).toBeDefined();
            expect(perimeterTrait.unit).toBe('mm');

            const circularityTrait = result.traits.find(t => t.type === 'circularity');
            expect(circularityTrait).toBeDefined();
            expect(circularityTrait.unit).toBe('ratio');

            const colorTraits = result.traits.filter(t => 
                ['red_channel', 'green_channel', 'blue_channel', 'hue', 'saturation', 'brightness'].includes(t.type)
            );
            expect(colorTraits.length).toBe(6); // 3 RGB + 3 HSV
        });

        test('should handle validation errors gracefully', async () => {
            const experimentData = {}; // Missing required fields
            const context = {};

            const result = await parser.process(experimentData, imageAnalysisData, context);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Validation failed');
            expect(result.traits).toEqual([]);
            expect(result.experimentUpdates).toEqual({});
        });

        test('should process data with only area measurements', async () => {
            const experimentData = {
                name: 'Area Only Test',
                sampleId: 'sample123',
                responsible: 'user456'
            };

            const fileData = {
                includedData: {
                    AreaMeasurements: [100, 101, 99]
                }
            };

            const context = {};

            const result = await parser.process(experimentData, fileData, context);

            expect(result.success).toBe(true);
            expect(result.traits).toHaveLength(1);
            expect(result.traits[0].type).toBe('area');
            expect(result.traits[0].measurement).toBe(100); // average of [100, 101, 99]
        });

        test('should calculate circularity when both area and perimeter are available', async () => {
            const experimentData = {
                name: 'Circularity Test',
                sampleId: 'sample123',
                responsible: 'user456'
            };

            const context = {};

            const result = await parser.process(experimentData, imageAnalysisData, context);

            expect(result.success).toBe(true);
            
            const circularityTrait = result.traits.find(t => t.type === 'circularity');
            expect(circularityTrait).toBeDefined();
            expect(typeof circularityTrait.measurement).toBe('number');
            expect(circularityTrait.measurement).toBeGreaterThan(0);
            expect(circularityTrait.measurement).toBeLessThanOrEqual(1);
        });
    });

    describe('Integration with test data', () => {
        test('should extract correct values from realistic test data', () => {
            const area = parser.extractArea(imageAnalysisData);
            expect(area).toBeCloseTo(126.4125, 2);

            const perimeter = parser.extractPerimeter(imageAnalysisData);
            expect(perimeter).toBeCloseTo(45.55, 2);

            const circularity = parser.calculateCircularity(area, perimeter);
            expect(circularity).toBeGreaterThan(0);
            expect(circularity).toBeLessThan(1);

            const colorTraits = parser.extractColorData(imageAnalysisData);
            expect(colorTraits).toHaveLength(6); // 3 RGB + 3 HSV
        });
    });
});

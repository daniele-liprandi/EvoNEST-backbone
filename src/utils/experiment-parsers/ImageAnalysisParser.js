/**
 * Image Analysis Parser
 * 
 * Example parser for image analysis experiments.
 * Demonstrates how to handle different types of experimental data.
 */

import { BaseExperimentParser } from './BaseExperimentParser.js';

export class ImageAnalysisParser extends BaseExperimentParser {
    constructor() {
        super();
        this.name = 'ImageAnalysisParser';
        this.label = 'Image Analysis';
        this.supportedTypes = ['image_analysis'];
        this.version = '1.0.0';
        this.description = 'Extracts morphometric measurements and color properties from images';
        this.author = 'EvoNEST Team';
        this.requiredFields = ['AreaMeasurements OR PerimeterMeasurements OR ColorData'];
        this.optionalFields = ['BoundingBox'];
        this.generatedTraits = [
            { name: 'area', unit: 'mm²', description: 'Object area measurement' },
            { name: 'perimeter', unit: 'mm', description: 'Object perimeter measurement' },
            { name: 'circularity', unit: 'ratio', description: 'Shape circularity (0-1)' },
            { name: 'red_channel', unit: 'intensity', description: 'Red color channel value' },
            { name: 'green_channel', unit: 'intensity', description: 'Green color channel value' },
            { name: 'blue_channel', unit: 'intensity', description: 'Blue color channel value' },
            { name: 'hue', unit: 'degrees', description: 'Color hue value' },
            { name: 'saturation', unit: 'percentage', description: 'Color saturation value' },
            { name: 'brightness', unit: 'percentage', description: 'Color brightness value' }
        ];
    }

    async process(experimentData, fileData, context) {
        this.log(`Processing image analysis for experiment: ${experimentData.name}`);

        const validation = this.validate(experimentData, fileData);
        if (!validation.success) {
            return {
                success: false,
                error: `Validation failed: ${validation.errors.join(', ')}`,
                traits: [],
                experimentUpdates: {},
            };
        }

        const traits = [];
        const experimentUpdates = {};

        try {
            // Extract area measurements
            const area = this.extractArea(fileData);
            if (area !== null) {
                experimentUpdates.area = area;
                
                const areaTrait = this.createTrait({
                    measurement: area,
                    type: "area",
                    unit: "mm²",
                    equipment: "image_analysis",
                }, experimentData);
                
                traits.push(areaTrait);
                this.log(`Extracted area: ${area}mm²`);
            }

            // Extract perimeter measurements
            const perimeter = this.extractPerimeter(fileData);
            if (perimeter !== null) {
                experimentUpdates.perimeter = perimeter;
                
                const perimeterTrait = this.createTrait({
                    measurement: perimeter,
                    type: "perimeter",
                    unit: "mm",
                    equipment: "image_analysis",
                }, experimentData);
                
                traits.push(perimeterTrait);
                this.log(`Extracted perimeter: ${perimeter}mm`);
            }

            // Calculate shape metrics if both area and perimeter are available
            if (area !== null && perimeter !== null) {
                const circularity = this.calculateCircularity(area, perimeter);
                if (circularity !== null) {
                    experimentUpdates.circularity = circularity;
                    
                    const circularityTrait = this.createTrait({
                        measurement: circularity,
                        type: "circularity",
                        unit: "ratio",
                        equipment: "image_analysis",
                        notes: "Calculated from area and perimeter measurements"
                    }, experimentData);
                    
                    traits.push(circularityTrait);
                    this.log(`Calculated circularity: ${circularity}`);
                }
            }

            // Extract color information if available
            const colorData = this.extractColorData(fileData);
            for (const color of colorData) {
                const colorTrait = this.createTrait(color, experimentData);
                traits.push(colorTrait);
                this.log(`Extracted ${color.type}: ${color.measurement}${color.unit}`);
            }

            return {
                success: true,
                traits,
                experimentUpdates,
                logMessage: `Processed image analysis data - extracted ${traits.length} traits`,
            };

        } catch (error) {
            this.log(`Error processing image analysis: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message,
                traits: [],
                experimentUpdates: {},
            };
        }
    }

    extractArea(fileData) {
        if (!fileData.includedData || !fileData.includedData.AreaMeasurements) {
            this.log('No area measurements found in file data', 'warn');
            return null;
        }

        const areas = fileData.includedData.AreaMeasurements;
        if (!Array.isArray(areas)) {
            // Single measurement
            return typeof areas === 'number' ? areas : null;
        }

        // Multiple measurements - return average
        return this.extractValue(areas, 'avg');
    }

    extractPerimeter(fileData) {
        if (!fileData.includedData || !fileData.includedData.PerimeterMeasurements) {
            this.log('No perimeter measurements found in file data', 'warn');
            return null;
        }

        const perimeters = fileData.includedData.PerimeterMeasurements;
        if (!Array.isArray(perimeters)) {
            return typeof perimeters === 'number' ? perimeters : null;
        }

        return this.extractValue(perimeters, 'avg');
    }

    calculateCircularity(area, perimeter) {
        if (area <= 0 || perimeter <= 0) {
            return null;
        }

        // Circularity = 4π × Area / Perimeter²
        const circularity = (4 * Math.PI * area) / (perimeter * perimeter);
        
        // Round to 4 decimal places
        return Math.round(circularity * 10000) / 10000;
    }

    extractColorData(fileData) {
        const colorTraits = [];

        if (!fileData.includedData || !fileData.includedData.ColorData) {
            return colorTraits;
        }

        const colorData = fileData.includedData.ColorData;

        // Extract RGB values
        if (colorData.RGB) {
            const { R, G, B } = colorData.RGB;
            if (typeof R === 'number' && typeof G === 'number' && typeof B === 'number') {
                colorTraits.push({
                    measurement: R,
                    type: "red_channel",
                    unit: "intensity",
                    equipment: "image_analysis",
                });
                colorTraits.push({
                    measurement: G,
                    type: "green_channel",
                    unit: "intensity",
                    equipment: "image_analysis",
                });
                colorTraits.push({
                    measurement: B,
                    type: "blue_channel",
                    unit: "intensity",
                    equipment: "image_analysis",
                });
            }
        }

        // Extract HSV values
        if (colorData.HSV) {
            const { H, S, V } = colorData.HSV;
            if (typeof H === 'number' && typeof S === 'number' && typeof V === 'number') {
                colorTraits.push({
                    measurement: H,
                    type: "hue",
                    unit: "degrees",
                    equipment: "image_analysis",
                });
                colorTraits.push({
                    measurement: S,
                    type: "saturation",
                    unit: "percentage",
                    equipment: "image_analysis",
                });
                colorTraits.push({
                    measurement: V,
                    type: "brightness",
                    unit: "percentage",
                    equipment: "image_analysis",
                });
            }
        }

        return colorTraits;
    }

    validate(experimentData, fileData) {
        const baseValidation = super.validate(experimentData, fileData);
        
        if (!baseValidation.success) {
            return baseValidation;
        }

        const errors = [];

        if (!fileData.includedData) {
            errors.push('Image analysis data is required');
        } else {
            // At least one measurement type should be present
            const hasAreaMeasurements = fileData.includedData.AreaMeasurements;
            const hasPerimeterMeasurements = fileData.includedData.PerimeterMeasurements;
            const hasColorData = fileData.includedData.ColorData;

            if (!hasAreaMeasurements && !hasPerimeterMeasurements && !hasColorData) {
                errors.push('At least one measurement type (area, perimeter, or color) is required');
            }
        }

        return {
            success: errors.length === 0,
            errors: [...baseValidation.errors, ...errors]
        };
    }
}

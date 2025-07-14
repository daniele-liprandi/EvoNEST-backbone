/**
 * Mechanical Test Parser
 * 
 * Handles mechanical testing experiments including tensile and compression tests.
 * Extracts load at break and other mechanical properties from raw data.
 */

import { BaseExperimentParser } from './BaseExperimentParser.js';

export class MechanicalTestParser extends BaseExperimentParser {
    constructor() {
        super();
        this.name = 'MechanicalTestParser';
        this.label = 'Mechanical Test';
        this.supportedTypes = ['mechanical_test'];
        this.version = '1.0.0';
        this.description = 'Automatically extracts load, displacement, and strain data from mechanical tests';
        this.author = 'EvoNEST Team';
        this.requiredFields = ['LoadOnSpecimen'];
        this.optionalFields = ['DisplacementOnSpecimen', 'Time'];
        this.generatedTraits = [
            { name: 'loadAtBreak', unit: 'N', description: 'Maximum load before failure' },
            { name: 'displacementAtBreak', unit: 'mm', description: 'Maximum displacement before failure' },
            { name: 'maxStrain', unit: '%', description: 'Calculated strain at maximum load' }
        ];
    }

    /**
     * Process mechanical test data and generate traits
     * 
     * @param {Object} experimentData - The experiment data
     * @param {Object} fileData - Associated file data with raw measurements
     * @param {Object} context - Context object containing database connections
     * @returns {Promise<Object>} Processing result
     */
    async process(experimentData, fileData, context) {
        this.log(`Processing mechanical test for experiment: ${experimentData.name}`);

        // Validate input data
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
            // Extract load at break from raw data
            const loadAtBreak = this.extractLoadAtBreak(fileData);
            
            if (loadAtBreak !== null) {
                // Add load at break to experiment updates
                experimentUpdates.loadAtBreak = loadAtBreak;

                // Create load at break trait
                const loadAtBreakTrait = this.createTrait({
                    measurement: loadAtBreak,
                    type: "loadAtBreak",
                    unit: "N",
                    equipment: "tensile_test",
                }, experimentData);

                traits.push(loadAtBreakTrait);

                this.log(`Extracted loadAtBreak: ${loadAtBreak}N`);
            }

            // Extract additional mechanical properties if available
            const additionalProperties = this.extractAdditionalProperties(fileData);
            
            for (const property of additionalProperties) {
                const trait = this.createTrait(property, experimentData);
                traits.push(trait);
                this.log(`Extracted ${property.type}: ${property.measurement}${property.unit}`);
            }

            return {
                success: true,
                traits,
                experimentUpdates,
                logMessage: `Processed mechanical test data - extracted ${traits.length} traits`,
            };

        } catch (error) {
            this.log(`Error processing mechanical test: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message,
                traits: [],
                experimentUpdates: {},
            };
        }
    }

    /**
     * Extract load at break from raw data
     * 
     * @param {Object} fileData - File data containing raw measurements
     * @returns {number|null} Load at break value or null if not found
     */
    extractLoadAtBreak(fileData) {
        // Check if we have the expected data structure
        if (!fileData.includedData || !fileData.includedData.LoadOnSpecimen) {
            this.log('No LoadOnSpecimen data found in file data', 'warn');
            return null;
        }

        const loadData = fileData.includedData.LoadOnSpecimen;
        if (!Array.isArray(loadData)) {
            this.log('LoadOnSpecimen data is not an array', 'warn');
            return null;
        }

        // Extract maximum load value
        return this.extractValue(loadData, 'max');
    }

    /**
     * Extract additional mechanical properties from raw data
     * Override this method to add more properties
     * 
     * @param {Object} fileData - File data containing raw measurements
     * @returns {Array} Array of additional property objects
     */
    extractAdditionalProperties(fileData) {
        const properties = [];

        // Example: Extract displacement at break if available
        if (fileData.includedData && fileData.includedData.DisplacementOnSpecimen) {
            const displacementAtBreak = this.extractValue(fileData.includedData.DisplacementOnSpecimen, 'max');
            if (displacementAtBreak !== null) {
                properties.push({
                    measurement: displacementAtBreak,
                    type: "displacementAtBreak",
                    unit: "mm",
                    equipment: "tensile_test",
                });
            }
        }

        // Example: Calculate strain if we have both load and displacement
        if (fileData.includedData && 
            fileData.includedData.LoadOnSpecimen && 
            fileData.includedData.DisplacementOnSpecimen) {
            
            const strain = this.calculateStrain(
                fileData.includedData.LoadOnSpecimen,
                fileData.includedData.DisplacementOnSpecimen
            );
            
            if (strain !== null) {
                properties.push({
                    measurement: strain,
                    type: "maxStrain",
                    unit: "%",
                    equipment: "tensile_test",
                });
            }
        }

        return properties;
    }

    /**
     * Calculate strain from load and displacement data
     * This is a simplified calculation - adapt based on your specific requirements
     * 
     * @param {Array} loadData - Load values
     * @param {Array} displacementData - Displacement values
     * @returns {number|null} Calculated strain or null if unable to calculate
     */
    calculateStrain(loadData, displacementData) {
        if (!Array.isArray(loadData) || !Array.isArray(displacementData)) {
            return null;
        }

        if (loadData.length !== displacementData.length) {
            this.log('Load and displacement data arrays have different lengths', 'warn');
            return null;
        }

        // Find the point of maximum load
        const maxLoad = Math.max(...loadData);
        const maxLoadIndex = loadData.indexOf(maxLoad);
        
        if (maxLoadIndex === -1) {
            return null;
        }

        // Get corresponding displacement
        const displacementAtMaxLoad = displacementData[maxLoadIndex];
        
        // Calculate strain (displacement / original length * 100)
        // Note: You may need to adjust this calculation based on your specimen dimensions
        const originalLength = 50; // mm - this should come from specimen data
        const strain = (displacementAtMaxLoad / originalLength) * 100;
        
        return strain;
    }

    /**
     * Validate mechanical test specific data
     * 
     * @param {Object} experimentData - The experiment data
     * @param {Object} fileData - Associated file data
     * @returns {Object} Validation result
     */
    validate(experimentData, fileData) {
        const baseValidation = super.validate(experimentData, fileData);
        
        if (!baseValidation.success) {
            return baseValidation;
        }

        const errors = [];

        // Check for required mechanical test data
        if (!fileData.includedData) {
            errors.push('Raw measurement data (includedData) is required for mechanical tests');
        } else if (!fileData.includedData.LoadOnSpecimen) {
            errors.push('LoadOnSpecimen data is required for mechanical tests');
        }

        return {
            success: errors.length === 0,
            errors: [...baseValidation.errors, ...errors]
        };
    }
}

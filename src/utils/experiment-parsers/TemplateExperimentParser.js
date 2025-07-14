/**
 * Template Experiment Parser
 * 
 * Copy this template to create new experiment parsers.
 * 
 * Steps to create a new parser:
 * 1. Copy this file to a new name (e.g., MyExperimentParser.js)
 * 2. Update the class name and supportedTypes
 * 3. Implement the process() method
 * 4. Add validation if needed
 * 5. Register in registry.js
 */

import { BaseExperimentParser } from './BaseExperimentParser.js';

export class TemplateExperimentParser extends BaseExperimentParser {
    constructor() {
        super();
        // Define which experiment types this parser handles
        this.supportedTypes = ['my_experiment_type'];
        this.version = '1.0.0';
    }

    /**
     * Process experiment data and generate traits
     * 
     * @param {Object} experimentData - The experiment data
     * @param {Object} fileData - Associated file data with raw measurements
     * @param {Object} context - Context object containing database connections
     * @returns {Promise<Object>} Processing result
     */
    async process(experimentData, fileData, context) {
        this.log(`Processing ${this.supportedTypes[0]} for experiment: ${experimentData.name}`);

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
            // TODO: Extract relevant data from fileData.includedData
            // Example:
            // const myMeasurement = this.extractMyMeasurement(fileData);
            
            // TODO: Process the data and create traits
            // Example:
            // if (myMeasurement !== null) {
            //     experimentUpdates.myMeasurement = myMeasurement;
            //     
            //     const trait = this.createTrait({
            //         measurement: myMeasurement,
            //         type: "myMeasurementType",
            //         unit: "units",
            //         equipment: "my_equipment",
            //     }, experimentData);
            //     
            //     traits.push(trait);
            //     this.log(`Extracted myMeasurement: ${myMeasurement}`);
            // }

            return {
                success: true,
                traits,
                experimentUpdates,
                logMessage: `Processed ${this.supportedTypes[0]} data - extracted ${traits.length} traits`,
            };

        } catch (error) {
            this.log(`Error processing ${this.supportedTypes[0]}: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message,
                traits: [],
                experimentUpdates: {},
            };
        }
    }

    /**
     * Extract specific measurements from raw data
     * TODO: Implement based on your data structure
     * 
     * @param {Object} fileData - File data containing raw measurements
     * @returns {number|null} Extracted value or null if not found
     */
    extractMyMeasurement(fileData) {
        // TODO: Implement extraction logic
        // Example:
        // if (!fileData.includedData || !fileData.includedData.MyDataField) {
        //     this.log('No MyDataField data found in file data', 'warn');
        //     return null;
        // }
        // 
        // const myData = fileData.includedData.MyDataField;
        // return this.extractValue(myData, 'max'); // or 'min', 'avg', etc.
        
        return null;
    }

    /**
     * Custom validation for this experiment type
     * TODO: Add specific validation rules
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

        // TODO: Add specific validation rules
        // Example:
        // if (!fileData.includedData) {
        //     errors.push('Raw measurement data (includedData) is required');
        // } else if (!fileData.includedData.MyRequiredField) {
        //     errors.push('MyRequiredField is required for this experiment type');
        // }

        return {
            success: errors.length === 0,
            errors: [...baseValidation.errors, ...errors]
        };
    }
}

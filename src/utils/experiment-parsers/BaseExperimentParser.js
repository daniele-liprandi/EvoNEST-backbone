/**
 * Base Experiment Parser Class
 * 
 * All experiment parsers should extend this base class.
 * This provides a consistent interface and common functionality.
 */

export class BaseExperimentParser {
    constructor() {
        this.name = this.constructor.name;
        this.supportedTypes = [];
        this.version = '1.0.0';
    }

    /**
     * Process experiment data and generate traits
     * This method must be implemented by child classes
     * 
     * @param {Object} experimentData - The experiment data
     * @param {Object} fileData - Associated file data with raw measurements
     * @param {Object} context - Context object containing database connections, etc.
     * @returns {Promise<Object>} Processing result
     */
    async process(experimentData, fileData, context) {
        throw new Error(`Process method must be implemented by ${this.name}`);
    }

    /**
     * Validate input data before processing
     * Override this method to add custom validation
     * 
     * @param {Object} experimentData - The experiment data
     * @param {Object} fileData - Associated file data
     * @returns {Object} Validation result with success boolean and errors array
     */
    validate(experimentData, fileData) {
        const errors = [];

        if (!experimentData) {
            errors.push('Experiment data is required');
        }

        if (!fileData) {
            errors.push('File data is required');
        }

        if (experimentData && !experimentData.sampleId) {
            errors.push('Sample ID is required');
        }

        if (experimentData && !experimentData.responsible) {
            errors.push('Responsible person is required');
        }

        return {
            success: errors.length === 0,
            errors
        };
    }

    /**
     * Create a trait object with common properties
     * 
     * @param {Object} traitData - Trait-specific data
     * @param {Object} experimentData - Experiment data for context
     * @returns {Object} Complete trait object
     */
    createTrait(traitData, experimentData) {
        const now = new Date().toISOString();
        
        return {
            method: "create",
            responsible: experimentData.responsible,
            sampleId: experimentData.sampleId,
            experimentId: experimentData.name,
            date: experimentData.date || now,
            recentChangeDate: now,
            logbook: [[now, `Created trait from experiment ${experimentData.name}`]],
            ...traitData
        };
    }

    /**
     * Create experiment update object with common properties
     * 
     * @param {Object} updates - Specific updates to apply
     * @param {string} logMessage - Message for the logbook
     * @returns {Object} Update object for MongoDB
     */
    createExperimentUpdate(updates, logMessage) {
        const now = new Date().toISOString();
        
        return {
            $set: {
                recentChangeDate: now,
                ...updates
            },
            $push: {
                logbook: [now, logMessage]
            }
        };
    }

    /**
     * Log processing information
     * 
     * @param {string} message - Message to log
     * @param {string} level - Log level (info, warn, error)
     */
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        console[level](`[${timestamp}] ${this.name}: ${message}`);
    }

    /**
     * Extract numeric value from raw data array
     * Common utility for finding max, min, average, etc.
     * 
     * @param {Array} data - Array of numeric values
     * @param {string} operation - 'max', 'min', 'avg', 'sum'
     * @returns {number|null} Calculated value or null if invalid
     */
    extractValue(data, operation = 'max') {
        if (!Array.isArray(data) || data.length === 0) {
            return null;
        }

        const numericData = data.filter(val => typeof val === 'number' && !isNaN(val));
        if (numericData.length === 0) {
            return null;
        }

        switch (operation) {
            case 'max':
                return Math.max(...numericData);
            case 'min':
                return Math.min(...numericData);
            case 'avg':
            case 'average':
                return numericData.reduce((sum, val) => sum + val, 0) / numericData.length;
            case 'sum':
                return numericData.reduce((sum, val) => sum + val, 0);
            default:
                return Math.max(...numericData);
        }
    }

    /**
     * Check if required data fields exist
     * 
     * @param {Object} data - Data object to check
     * @param {Array} requiredFields - Array of required field names
     * @returns {Object} Check result with success boolean and missing fields
     */
    checkRequiredFields(data, requiredFields) {
        const missing = [];
        
        for (const field of requiredFields) {
            if (!(field in data) || data[field] === null || data[field] === undefined) {
                missing.push(field);
            }
        }

        return {
            success: missing.length === 0,
            missing
        };
    }
}

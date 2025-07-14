/**
 * Experiment Parser Registry
 * 
 * This registry manages all experiment parsers, similar to the sample cards system.
 * Parsers are responsible for processing experimental data and generating traits.
 */

import { MechanicalTestParser } from './MechanicalTestParser';
import { ImageAnalysisParser } from './ImageAnalysisParser';
// Import other parsers here as they are created
// import { SpectroscopyParser } from './SpectroscopyParser';

/**
 * Registry of experiment parsers by experiment type
 * Each parser can handle multiple experiment types if needed
 */
export const EXPERIMENT_PARSERS = {
    'mechanical_test': MechanicalTestParser,
    'image_analysis': ImageAnalysisParser,
    // Add more mappings as needed
    // 'spectroscopy': SpectroscopyParser,
};

/**
 * Get parser for a specific experiment type
 * @param {string} experimentType - The type of experiment
 * @returns {Object|null} Parser class or null if not found
 */
export function getParser(experimentType) {
    return EXPERIMENT_PARSERS[experimentType] || null;
}

/**
 * Get all registered experiment types
 * @returns {string[]} Array of experiment types
 */
export function getRegisteredTypes() {
    return Object.keys(EXPERIMENT_PARSERS);
}

/**
 * Check if a parser exists for an experiment type
 * @param {string} experimentType - The type of experiment
 * @returns {boolean} True if parser exists
 */
export function hasParser(experimentType) {
    return experimentType in EXPERIMENT_PARSERS;
}

/**
 * Process experiment data using the appropriate parser
 * @param {string} experimentType - The type of experiment
 * @param {Object} experimentData - The experiment data to process
 * @param {Object} fileData - The file data associated with the experiment
 * @param {Object} context - Additional context (db, collections, etc.)
 * @returns {Promise<Object>} Processing result with traits and metadata
 */
export async function processExperiment(experimentType, experimentData, fileData, context) {
    const Parser = getParser(experimentType);
    
    console.log("Registry processExperiment called with:");
    console.log("- experimentType:", experimentType);
    console.log("- experimentData keys:", Object.keys(experimentData || {}));
    console.log("- fileData keys:", Object.keys(fileData || {}));
    console.log("- fileData.includedData:", !!fileData?.includedData);
    
    if (!Parser) {
        console.warn(`No parser found for experiment type: ${experimentType}`);
        return {
            success: false,
            error: `No parser available for experiment type: ${experimentType}`,
            traits: [],
            experimentUpdates: {},
        };
    }

    try {
        const parser = new Parser();
        const result = await parser.process(experimentData, fileData, context);
        console.log("Parser result:", result);
        return result;
    } catch (error) {
        console.error(`Error processing experiment with ${experimentType} parser:`, error);
        return {
            success: false,
            error: error.message,
            traits: [],
            experimentUpdates: {},
        };
    }
}

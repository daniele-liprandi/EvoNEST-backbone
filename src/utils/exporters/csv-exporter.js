/**
 * CSV Export Utilities
 * Flattens nested JSON structures for CSV export with prefixed keys
 */

/**
 * Flattens a nested object with prefixed keys
 * @param {Object} obj - Object to flatten
 * @param {string} prefix - Prefix for keys
 * @param {Object} result - Result object (for recursion)
 * @returns {Object} - Flattened object
 */
function flattenObject(obj, prefix = '', result = {}) {
    if (!obj || typeof obj !== 'object') {
        return result;
    }

    for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}_${key}` : key;

        if (value === null || value === undefined) {
            result[newKey] = '';
        } else if (value instanceof Date) {
            result[newKey] = value.toISOString();
        } else if (Array.isArray(value)) {
            // Handle arrays specially
            if (value.length === 0) {
                result[newKey] = '';
            } else if (typeof value[0] === 'object' && value[0] !== null) {
                // Array of objects - don't flatten, just stringify
                result[newKey] = JSON.stringify(value);
            } else {
                // Array of primitives - join with semicolons
                result[newKey] = value.join('; ');
            }
        } else if (typeof value === 'object' && !(value instanceof Date)) {
            // Check if it's an ObjectId (has _bsontype property)
            if (value._bsontype === 'ObjectId' || value.toString) {
                result[newKey] = value.toString();
            } else {
                // Recursively flatten nested objects
                flattenObject(value, newKey, result);
            }
        } else {
            result[newKey] = value;
        }
    }

    return result;
}

/**
 * Flattens sample chain with indexed prefixes
 * @param {Array} sampleChain - Array of samples from child to root
 * @returns {Object} - Flattened object with sample_0_, sample_1_, etc.
 */
function flattenSampleChain(sampleChain) {
    const flattened = {};
    
    if (!sampleChain || !Array.isArray(sampleChain)) {
        return flattened;
    }

    sampleChain.forEach((sample, index) => {
        const prefix = index === 0 ? 'sample' : `parent_${index}`;
        const sampleFlat = flattenObject(sample, prefix);
        Object.assign(flattened, sampleFlat);
    });

    return flattened;
}

/**
 * Flattens parent chain with indexed prefixes
 * @param {Array} parentChain - Array of parent samples
 * @returns {Object} - Flattened object with parent_1_, parent_2_, etc.
 */
function flattenParentChain(parentChain) {
    const flattened = {};
    
    if (!parentChain || !Array.isArray(parentChain)) {
        return flattened;
    }

    parentChain.forEach((parent, index) => {
        const prefix = `parent_${index + 1}`;
        const parentFlat = flattenObject(parent, prefix);
        Object.assign(flattened, parentFlat);
    });

    return flattened;
}

/**
 * Flattens traits array
 * @param {Array} traits - Array of trait objects
 * @returns {Object} - Object with stringified traits
 */
function flattenTraits(traits) {
    if (!traits || !Array.isArray(traits) || traits.length === 0) {
        return { traits: '' };
    }
    
    // For CSV, we'll include basic trait info as a summary
    const traitSummary = traits.map(t => `${t.type}: ${t.measurement} ${t.unit || ''}`).join('; ');
    return { 
        traits_summary: traitSummary,
        traits_count: traits.length
    };
}

/**
 * Flattens an experiment with related data for CSV export
 * @param {Object} experiment - Experiment object with potential sampleChain and traits
 * @returns {Object} - Flattened experiment
 */
export function flattenExperimentForCSV(experiment) {
    const flattened = {};
    
    // Flatten main experiment fields (excluding special nested fields)
    const { sampleChain, traits, sample, ...mainFields } = experiment;
    Object.assign(flattened, flattenObject(mainFields));
    
    // Flatten sample chain if present
    if (sampleChain && Array.isArray(sampleChain)) {
        Object.assign(flattened, flattenSampleChain(sampleChain));
    }
    
    // Flatten traits if present
    if (traits && Array.isArray(traits)) {
        Object.assign(flattened, flattenTraits(traits));
    }
    
    return flattened;
}

/**
 * Flattens a trait with related data for CSV export
 * @param {Object} trait - Trait object with potential sampleChain
 * @returns {Object} - Flattened trait
 */
export function flattenTraitForCSV(trait) {
    const flattened = {};
    
    // Flatten main trait fields (excluding special nested fields)
    const { sampleChain, sample, ...mainFields } = trait;
    Object.assign(flattened, flattenObject(mainFields));
    
    // Flatten sample chain if present
    if (sampleChain && Array.isArray(sampleChain)) {
        Object.assign(flattened, flattenSampleChain(sampleChain));
    }
    
    return flattened;
}

/**
 * Flattens a sample with related data for CSV export
 * @param {Object} sample - Sample object with potential parentChain
 * @returns {Object} - Flattened sample
 */
export function flattenSampleForCSV(sample) {
    const flattened = {};
    
    // Flatten main sample fields (excluding special nested fields)
    const { parentChain, ...mainFields } = sample;
    Object.assign(flattened, flattenObject(mainFields));
    
    // Flatten parent chain if present
    if (parentChain && Array.isArray(parentChain)) {
        Object.assign(flattened, flattenParentChain(parentChain));
    }
    
    return flattened;
}

/**
 * Converts an array of objects to CSV format
 * @param {Array} data - Array of flattened objects
 * @returns {string} - CSV string
 */
export function convertToCSV(data) {
    if (!data || data.length === 0) {
        return '';
    }
    
    // Get all unique keys from all objects
    const allKeys = new Set();
    data.forEach(obj => {
        Object.keys(obj).forEach(key => allKeys.add(key));
    });
    
    const headers = Array.from(allKeys);
    
    // Create CSV header row
    const csvRows = [headers.map(h => `"${h}"`).join(',')];
    
    // Create data rows
    data.forEach(obj => {
        const values = headers.map(header => {
            const value = obj[header];
            if (value === null || value === undefined) {
                return '""';
            }
            // Escape quotes and wrap in quotes
            const stringValue = String(value).replace(/"/g, '""');
            return `"${stringValue}"`;
        });
        csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
}

/**
 * Exports experiments to CSV format with flattened related data
 * @param {Array} experiments - Array of experiments
 * @returns {string} - CSV string
 */
export function exportExperimentsToCSV(experiments) {
    const flattened = experiments.map(exp => flattenExperimentForCSV(exp));
    return convertToCSV(flattened);
}

/**
 * Exports traits to CSV format with flattened related data
 * @param {Array} traits - Array of traits
 * @returns {string} - CSV string
 */
export function exportTraitsToCSV(traits) {
    const flattened = traits.map(trait => flattenTraitForCSV(trait));
    return convertToCSV(flattened);
}

/**
 * Exports samples to CSV format with flattened related data
 * @param {Array} samples - Array of samples
 * @returns {string} - CSV string
 */
export function exportSamplesToCSV(samples) {
    const flattened = samples.map(sample => flattenSampleForCSV(sample));
    return convertToCSV(flattened);
}

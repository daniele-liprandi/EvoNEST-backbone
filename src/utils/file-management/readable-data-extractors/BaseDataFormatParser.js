/**
 * Base Data Format Parser Class
 * 
 * All data format parsers should extend this base class.
 * This provides a consistent interface for parsing different file formats.
 * 
 * All parsers MUST return data conforming to the ParsedDataResult interface:
 * - format: string (name of the detected format)
 * - suggestedExperimentType: string (suggested experiment type)
 * - experimentData: ExperimentAPIData (complete experiment object for API)
 * - parsingMetadata?: object (optional metadata about parsing process)
 */

export class BaseDataFormatParser {
    constructor() {
        this.name = this.constructor.name;
        this.supportedFormats = [];
        this.version = '1.0.0';
        this.label = this.name; // Default label is the parser name
        this.description = '';
        this.author = '';
    }

    /**
     * Parse raw data into structured format
     * This method must be implemented by child classes
     * 
     * @param {string|object} rawData - Raw data from file processor
     * @param {Object} fileMetadata - File metadata (name, type, size, etc.)
     * @returns {ParsedDataResult} Structured data object conforming to ParsedDataResult interface
     */
    parse(rawData, fileMetadata) {
        throw new Error(`Parse method must be implemented by ${this.name}`);
    }

    /**
     * Detect if this parser can handle the given data
     * Override this method to add custom detection logic
     * 
     * @param {string|object} rawData - Raw data to analyze
     * @param {Object} fileMetadata - File metadata
     * @returns {boolean} True if this parser can handle the data
     */
    canParse(rawData, fileMetadata) {
        // Default implementation: check file extension or content patterns
        if (!fileMetadata || !fileMetadata.filename) {
            return false;
        }

        const filename = fileMetadata.filename.toLowerCase();
        return this.supportedFormats.some(format => 
            filename.endsWith(format.toLowerCase())
        );
    }

    /**
     * Validate the parsed data structure
     * Override this method to add custom validation
     * 
     * @param {ParsedDataResult} parsedData - The parsed data to validate
     * @returns {Object} Validation result with success boolean and errors array
     */
    validate(parsedData) {
        const errors = [];

        if (!parsedData || typeof parsedData !== 'object') {
            errors.push('Parsed data must be an object');
            return { success: false, errors };
        }

        // Validate required fields for ParsedDataResult interface
        if (!parsedData.format || typeof parsedData.format !== 'string') {
            errors.push('Parsed data must have a format field (string)');
        }

        if (!parsedData.suggestedExperimentType || typeof parsedData.suggestedExperimentType !== 'string') {
            errors.push('Parsed data must have a suggestedExperimentType field (string)');
        }

        if (!parsedData.experimentData || typeof parsedData.experimentData !== 'object') {
            errors.push('Parsed data must have an experimentData field (object)');
            return { success: false, errors };
        }

        // Validate experimentData structure (ExperimentAPIData interface)
        const experimentData = parsedData.experimentData;

        if (experimentData.traits && !Array.isArray(experimentData.traits)) {
            errors.push('ExperimentData.traits must be an array');
        }

        // Validate parsingMetadata if present
        if (parsedData.parsingMetadata) {
            if (typeof parsedData.parsingMetadata !== 'object') {
                errors.push('ParsingMetadata must be an object');
            } else if (parsedData.parsingMetadata.confidence !== undefined && 
                       (typeof parsedData.parsingMetadata.confidence !== 'number' || 
                        parsedData.parsingMetadata.confidence < 0 || 
                        parsedData.parsingMetadata.confidence > 1)) {
                errors.push('ParsingMetadata.confidence must be a number between 0 and 1');
            }
        }

        return {
            success: errors.length === 0,
            errors
        };
    }

    /**
     * Log parsing information
     * 
     * @param {string} message - Message to log
     * @param {string} level - Log level (info, warn, error)
     */
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        console[level](`[${timestamp}] ${this.name}: ${message}`);
    }

    /**
     * Parse CSV-like data with headers
     * Utility method for common CSV parsing needs
     * 
     * @param {string} csvData - Raw CSV data
     * @param {string} delimiter - Column delimiter (default: comma)
     * @param {boolean} hasHeaders - Whether first row contains headers
     * @returns {Array} Array of objects with parsed data
     */
    parseCSV(csvData, delimiter = ',', hasHeaders = true) {
        const lines = csvData.trim().split('\n');
        if (lines.length === 0) return [];

        const headers = hasHeaders ? lines[0].split(delimiter).map(h => h.trim()) : null;
        const dataLines = hasHeaders ? lines.slice(1) : lines;

        return dataLines.map((line, index) => {
            const values = line.split(delimiter).map(v => v.trim());
            
            if (hasHeaders && headers) {
                const row = {};
                headers.forEach((header, i) => {
                    row[header] = this.parseValue(values[i]);
                });
                return row;
            } else {
                return values.map(v => this.parseValue(v));
            }
        });
    }

    /**
     * Parse a string value to appropriate type (number, boolean, or string)
     * 
     * @param {string} value - String value to parse
     * @returns {any} Parsed value
     */
    parseValue(value) {
        if (value === undefined || value === null || value === '') {
            return null;
        }

        // Try to parse as number
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            return numValue;
        }

        // Try to parse as boolean
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'true' || lowerValue === 'false') {
            return lowerValue === 'true';
        }

        // Return as string
        return value;
    }

    /**
     * Extract metadata from structured sections
     * Utility for parsing files with metadata sections
     * 
     * @param {string} content - Raw content
     * @param {string} startMarker - Start marker for metadata section
     * @param {string} endMarker - End marker for metadata section
     * @returns {Object} Extracted metadata
     */
    extractMetadataSection(content, startMarker, endMarker) {
        const startIndex = content.indexOf(startMarker);
        const endIndex = content.indexOf(endMarker);
        
        if (startIndex === -1 || endIndex === -1) {
            return {};
        }

        const metadataSection = content.substring(startIndex + startMarker.length, endIndex);
        const metadata = {};

        metadataSection.split('\n').forEach(line => {
            line = line.trim();
            if (line && line.includes(',')) {
                const [key, ...valueParts] = line.split(',');
                const value = valueParts.join(',').trim();
                if (key && value) {
                    metadata[key.trim()] = this.parseValue(value);
                }
            }
        });

        return metadata;
    }

    /**
     * Create a standard ExperimentAPIData object
     * Utility method to help parsers create consistent experiment data structures
     * 
     * @param {Object} options - Options for creating experiment data
     * @param {string} options.name - Experiment name
     * @param {string} options.type - Experiment type
     * @param {string} options.filename - Original filename
     * @param {string} options.sampleId - Sample ID (optional)
     * @param {string} options.notes - Notes about the experiment
     * @param {any} options.data - Processed data content
     * @param {Array} options.traits - Array of extracted traits (optional)
     * @returns {Object} ExperimentAPIData object
     */
    createExperimentData({
        name,
        type,
        filename,
        sampleId = '',
        notes = '',
        data = null,
        traits = null
    }) {
        const currentDate = new Date().toISOString();
        
        const experimentData = {
            name: name,
            sampleId: sampleId,
            responsible: '', // Will be filled by the UI
            type: type,
            date: currentDate,
            notes: notes,
            filename: filename,
            filepath: '', // Will be set when file is saved
            fileId: '', // Will be set when file is saved
            version: 1,
            conversionHistory: [],
            recentChangeDate: currentDate,
            logbook: [[currentDate, `Parsed ${this.name} data from ${filename}`]],
            data: data
        };

        if (traits && Array.isArray(traits) && traits.length > 0) {
            experimentData.traits = traits;
        }

        return experimentData;
    }

    /**
     * Create a standard ParsedDataResult object
     * Utility method to help parsers create consistent result structures
     * 
     * @param {Object} options - Options for creating parsed data result
     * @param {string} options.format - Format name
     * @param {string} options.suggestedExperimentType - Suggested experiment type
     * @param {Object} options.experimentData - ExperimentAPIData object
     * @param {number} options.confidence - Parsing confidence (0-1)
     * @param {string} options.autoDetectedReason - Reason for detection
     * @param {Array} options.alternativeTypes - Alternative experiment types
     * @returns {Object} ParsedDataResult object
     */
    createParsedDataResult({
        format,
        suggestedExperimentType,
        experimentData,
        confidence = 0.9,
        autoDetectedReason = `${format} format detected`,
        alternativeTypes = []
    }) {
        return {
            format: format,
            suggestedExperimentType: suggestedExperimentType,
            experimentData: experimentData,
            parsingMetadata: {
                confidence: confidence,
                autoDetectedReason: autoDetectedReason,
                alternativeTypes: alternativeTypes,
                parsedAt: new Date().toISOString()
            }
        };
    }
}

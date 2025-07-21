/**
 * Data Format Parser Registry
 * 
 * Central registry for all data format parsers.
 * Handles parser discovery and selection.
 */

import { LoggerMateFormatParser } from './LoggerMateFormatParser.js';
import { CSVFormatParser } from './CSVFormatParser.js';
import { TensileTestFormatParser } from './TensileTestFormatParser.js';

class DataFormatParserRegistry {
    constructor() {
        this.parsers = new Map();
        this.registerDefaultParsers();
    }

    /**
     * Register default parsers
     */
    registerDefaultParsers() {
        this.register(new LoggerMateFormatParser());
        this.register(new CSVFormatParser());
        this.register(new TensileTestFormatParser());
    }

    /**
     * Register a new parser
     * 
     * @param {BaseDataFormatParser} parser - Parser instance to register
     */
    register(parser) {
        if (!parser || !parser.name) {
            throw new Error('Parser must have a name');
        }

        this.parsers.set(parser.name, parser);
        console.log(`Registered data format parser: ${parser.name}`);
    }

    /**
     * Get all registered parsers
     * 
     * @returns {Array} Array of parser instances
     */
    getAll() {
        return Array.from(this.parsers.values());
    }

    /**
     * Get parser by name
     * 
     * @param {string} name - Parser name
     * @returns {BaseDataFormatParser|null} Parser instance or null if not found
     */
    getByName(name) {
        return this.parsers.get(name) || null;
    }

    /**
     * Find the best parser for the given data
     * 
     * @param {string|object} rawData - Raw data to parse
     * @param {Object} fileMetadata - File metadata
     * @returns {BaseDataFormatParser|null} Best matching parser or null
     */
    findParser(rawData, fileMetadata) {
        const availableParsers = this.getAll();
        
        // Try each parser's canParse method
        for (const parser of availableParsers) {
            try {
                if (parser.canParse(rawData, fileMetadata)) {
                    console.log(`Selected parser: ${parser.name} for file: ${fileMetadata?.filename || 'unknown'}`);
                    return parser;
                }
            } catch (error) {
                console.warn(`Parser ${parser.name} failed canParse check:`, error.message);
            }
        }

        console.warn(`No suitable parser found for file: ${fileMetadata?.filename || 'unknown'}`);
        return null;
    }

    /**
     * Parse data using the best available parser
     * 
     * @param {string|object} rawData - Raw data to parse
     * @param {Object} fileMetadata - File metadata
     * @param {Object} options - Parsing options
     * @returns {Object} Parsed data or null if no parser available
     */
    parse(rawData, fileMetadata, options = {}) {
        const parser = this.findParser(rawData, fileMetadata);
        
        if (!parser) {
            return null;
        }

        try {
            const parsedData = parser.parse(rawData, fileMetadata, options);
            
            // Validate parsed data
            const validation = parser.validate(parsedData);
            if (!validation.success) {
                console.error(`Parser ${parser.name} validation failed:`, validation.errors);
                return null;
            }

            return parsedData;
        } catch (error) {
            console.error(`Parser ${parser.name} failed to parse data:`, error.message);
            return null;
        }
    }

    /**
     * Get parser information for UI
     * 
     * @returns {Array} Array of parser information objects
     */
    getParserInfo() {
        return this.getAll().map(parser => ({
            name: parser.name,
            supportedFormats: parser.supportedFormats,
            version: parser.version,
            description: parser.description,
            author: parser.author
        }));
    }
}

// Create singleton instance
const dataFormatParserRegistry = new DataFormatParserRegistry();

export default dataFormatParserRegistry;
export { DataFormatParserRegistry };

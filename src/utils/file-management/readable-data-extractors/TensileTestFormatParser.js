/**
 * Tensile Test Format Parser
 * 
 * Handles "EVOMECT150NanoTestDataFile" format files from tensile test machines.
 * This replaces the old read_trait, read_text, and read_tensile_data functions.
 * 
 * Returns ParsedDataResult with:
 * - format: 'EVOMECT150'
 * - suggestedExperimentType: 'tensile_test'
 * - experimentData: Complete experiment object with tensile test data
 * - parsingMetadata: Confidence and detection information
 */

import { BaseDataFormatParser } from './BaseDataFormatParser.js';

export class TensileTestFormatParser extends BaseDataFormatParser {
    constructor() {
        super();
        this.name = 'TensileTestFormatParser';
        this.label = 'EVOMECT150 Tensile Test Parser';
        this.description = 'Parser for EVOMECT150NanoTestDataFile format from tensile test machines';
        this.supportedFormats = ['.txt']; // File extensions this parser supports
        this.version = '1.0.0';
        this.author = 'Daniele Liprandi'; 
        
        this.requiresStructuredData = true; 
        this.supportedExperimentTypes = ['tensile_test'];
        this.primaryExperimentType = 'tensile_test';
        this.requiredFields = ['force', 'displacement', 'time'];
        this.generatedTraits = [
            {
                name: 'max_force',
                unit: 'N',
                description: 'Maximum force recorded during tensile test'
            },
            {
                name: 'max_displacement',
                unit: 'mm',
                description: 'Maximum displacement recorded during tensile test'
            },
            {
                name: 'test_duration',
                unit: 'seconds',
                description: 'Total duration of the tensile test'
            },
            {
                name: 'sample_frequency',
                unit: 'Hz',
                description: 'Data sampling frequency during the test'
            },
            {
                name: 'ultimate_tensile_strength',
                unit: 'MPa',
                description: 'Ultimate tensile strength calculated from force and area'
            },
            {
                name: 'youngs_modulus',
                unit: 'GPa',
                description: 'Young\'s modulus calculated from stress-strain curve'
            }
        ];
    }

    /**
     * Check if this parser can handle the given file
     * @param {string} content - File content
     * @param {Object} metadata - File metadata
     * @returns {boolean} True if parser can handle this file
     */
    canParse(content, metadata) {
        return typeof content === 'string' && 
               content.startsWith("EVOMECT150NanoTestDataFile");
    }

    /**
     * Parse tensile test file content
     * @param {string} content - Raw file content
     * @param {Object} metadata - File metadata (filename, size, etc.)
     * @returns {ParsedDataResult} Standardized parsed data structure
     */
    parse(content, metadata) {
        try {
            this.log(`Parsing EVOMECT150 tensile test from file: ${metadata?.filename || 'unknown'}`);

            // Extract all the data components
            const extractedTraits = this.extractTraits(content);
            const textFields = this.extractTextFields(content);
            const channelData = this.extractChannelData(content);
            
            // Create experiment data structure
            const experimentData = this.createExperimentData({
                name: `TensileTest_${metadata?.filename?.replace(/\.[^/.]+$/, '') || 'unknown'}`,
                type: 'tensile_test',
                filename: metadata?.filename || 'unknown.txt',
                sampleId: textFields?.SpecimenName || '', // Will need to be mapped to actual sample
                notes: `Tensile test data with ${Object.keys(extractedTraits).length} traits and ${Object.keys(channelData).length} channels`,
                data: {
                    traits: extractedTraits,
                    textFields: textFields,
                    channelData: channelData,
                    summary: this.generateChannelSummary(channelData),
                    metadata: {
                        fileType: 'EVOMECT150NanoTestDataFile',
                        originalSize: metadata?.size,
                        lastModified: metadata?.lastModified
                    }
                }
            });

            // Convert extracted traits to API format
            const traits = this.convertTraitsToAPIFormat(extractedTraits, experimentData.sampleId, experimentData.date);
            if (traits.length > 0) {
                experimentData.traits = traits;
            }

            // Create the result using the new ParsedDataResult structure
            const result = this.createParsedDataResult({
                format: 'EVOMECT150',
                suggestedExperimentType: 'tensile_test',
                experimentData: experimentData,
                confidence: 1.0,
                autoDetectedReason: 'EVOMECT150 tensile test file detected',
                alternativeTypes: ['mechanical_test', 'material_testing']
            });

            this.log(`Successfully parsed tensile test data: ${Object.keys(extractedTraits).length} traits, ${Object.keys(channelData).length} channels`);
            return result;

        } catch (error) {
            this.log(`Error parsing tensile test file: ${error.message}`, 'error');
            throw new Error(`Failed to parse tensile test file: ${error.message}`);
        }
    }

    /**
     * Convert extracted traits to API format
     */
    convertTraitsToAPIFormat(extractedTraits, sampleId, date) {
        const traits = [];
        
        // Define trait type mappings
        const traitTypeMap = {
            'YoungsModulus': 'youngs_modulus',
            'UltimateStress': 'ultimate_stress',
            'YieldStress': 'yield_stress',
            'StrainAtBreak': 'strain_at_break',
            'StressAtBreak': 'stress_at_break'
        };

        // Define unit mappings
        const unitMap = {
            'YoungsModulus': 'Pa',
            'UltimateStress': 'Pa',
            'YieldStress': 'Pa',
            'StrainAtBreak': '',
            'StressAtBreak': 'Pa'
        };

        Object.entries(extractedTraits).forEach(([traitName, value]) => {
            if (value !== null && value !== undefined && !isNaN(value)) {
                traits.push({
                    method: "create",
                    type: traitTypeMap[traitName] || traitName.toLowerCase(),
                    sampleId: sampleId,
                    responsible: "", // Will be filled by the UI
                    date: date,
                    measurement: value,
                    unit: unitMap[traitName] || "",
                    equipment: "EVOMECT150",
                    detail: "Tensile test measurement",
                    notes: `Extracted from EVOMECT150 file: ${traitName}`
                });
            }
        });

        return traits;
    }

    /**
     * Generate summary for channel data
     */
    generateChannelSummary(channelData) {
        const summary = {
            channelCount: Object.keys(channelData).length,
            recordCount: 0,
            channels: {}
        };

        // Get record count from the first channel and analyze each channel
        Object.entries(channelData).forEach(([channelName, data]) => {
            if (Array.isArray(data) && data.length > 0) {
                if (summary.recordCount === 0) {
                    summary.recordCount = data.length;
                }
                
                const numericData = data.filter(v => typeof v === 'number' && !isNaN(v));
                if (numericData.length > 0) {
                    summary.channels[channelName] = {
                        min: Math.min(...numericData),
                        max: Math.max(...numericData),
                        avg: numericData.reduce((sum, val) => sum + val, 0) / numericData.length,
                        count: numericData.length
                    };
                }
            }
        });

        return summary;
    }

    /**
     * Extract trait values from the file content
     * Replaces the old read_trait function
     */
    extractTraits(content) {
        // Define the trait names (you'll need to import or define these)
        const traitNames = [
            'YoungsModulus',
            'UltimateStress', 
            'YieldStress',
            'StrainAtBreak',
            'StressAtBreak',
            // Add more trait names as needed
        ];

        const traits = {};

        for (const traitName of traitNames) {
            try {
                const value = this.readTrait(content, traitName);
                if (value !== null) {
                    traits[traitName] = value;
                }
            } catch (error) {
                console.warn(`Failed to extract trait ${traitName}:`, error.message);
            }
        }

        return traits;
    }

    /**
     * Extract text fields from the file content
     * Replaces the old read_text function
     */
    extractTextFields(content) {
        // Define the text field names (you'll need to import or define these)
        const textNames = [
            'SpecimenName',
            'TestMethod',
            'Operator',
            // Add more text field names as needed
        ];

        const textFields = {};

        for (const textName of textNames) {
            try {
                const value = this.readText(content, textName);
                if (value !== null) {
                    textFields[textName] = value;
                }
            } catch (error) {
                console.warn(`Failed to extract text field ${textName}:`, error.message);
            }
        }

        return textFields;
    }

    /**
     * Extract channel data from the file content
     * Replaces the old read_tensile_data function
     */
    extractChannelData(content) {
        try {
            const position = content.search("Channel Data");
            if (position === -1) {
                throw new Error("Channel Data section not found");
            }

            const output = content.substr(position);
            const outputSplit = output.split(/\r\n/);
            
            // Get channel names from the header
            let channelNamesRaw = outputSplit[2];
            const channelNames = channelNamesRaw.split(",").map(name => 
                name.replace(/[\ \"]+/g, "")
            );

            // Skip header rows (4 rows before data starts)
            const dataRows = outputSplit.slice(4);
            
            // Parse numeric data
            const arrayOfNumbers = dataRows
                .filter(row => row.trim()) // Remove empty rows
                .map(row => row.split(',').map(Number));

            // Transpose the 2D array to group by channels
            const channelDataSorted = arrayOfNumbers[0].map((_, colIndex) => 
                arrayOfNumbers.map(row => row[colIndex])
            );

            // Create object with channel names as keys
            const result = {};
            channelNames.forEach((name, index) => {
                if (name && channelDataSorted[index]) {
                    result[name] = channelDataSorted[index];
                }
            });

            return result;

        } catch (error) {
            console.error('Error extracting channel data:', error);
            return {};
        }
    }

    /**
     * Read a trait value from the text content
     * Direct port of the old read_trait function
     */
    readTrait(text, trait) {
        try {
            const position = text.search(trait);
            if (position === -1) return null;

            const startPos = position + trait.length;
            const output = text.substr(startPos, 50); // Read reasonable chunk
            const outputSplit = output.split(/\r| /);
            
            if (outputSplit.length < 3) return null;

            const unit = outputSplit[2];
            const rawValue = parseFloat(outputSplit[1]);
            
            if (isNaN(rawValue)) return null;

            // Apply unit conversion (you'll need to implement extractPowerFromPrefixBeforeText)
            const power = this.extractPowerFromPrefixBeforeText(unit, "Pa");
            const value = rawValue * Math.pow(10, power);
            
            return value;

        } catch (error) {
            console.warn(`Error reading trait ${trait}:`, error.message);
            return null;
        }
    }

    /**
     * Read a text value from the content
     * Direct port of the old read_text function
     */
    readText(text, trait) {
        try {
            const position = text.search(trait);
            if (position === -1) return null;

            const startPos = position + trait.length;
            const output = text.substr(startPos, 50); // Read reasonable chunk
            const outputSplit = output.split(/\r| /);
            
            if (outputSplit.length < 2) return null;

            const word = outputSplit[1];
            
            // Capitalize the first letter and make the rest lowercase
            const formattedWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            const result = formattedWord + word.slice(formattedWord.length);

            // Handle the "_w" + digit pattern
            if (result.match(/_w\d$/)) {
                return {
                    value: result.slice(0, -3),
                    window: result.slice(-1)
                };
            }

            return result;

        } catch (error) {
            console.warn(`Error reading text ${trait}:`, error.message);
            return null;
        }
    }

    /**
     * Extract power from unit prefix (you'll need to implement this)
     * This was imported from "@/utils/types" in your old code
     */
    extractPowerFromPrefixBeforeText(unit, baseUnit) {
        // TODO: Implement your unit conversion logic here
        // This should handle prefixes like "kPa", "MPa", "GPa", etc.
        
        if (!unit || !unit.includes(baseUnit)) return 0;
        
        const prefix = unit.replace(baseUnit, '');
        
        switch (prefix.toLowerCase()) {
            case 'k': return 3;   // kilo
            case 'm': return 6;   // mega
            case 'g': return 9;   // giga
            case 'µ': 
            case 'u': return -6;  // micro
            case 'n': return -9;  // nano
            default: return 0;
        }
    }

    /**
     * Validate the parsed tensile test data
     */
    validate(parsedData) {
        const baseValidation = super.validate(parsedData);
        if (!baseValidation.success) {
            return baseValidation;
        }

        const errors = [];

        // Check that we have the new ParsedDataResult structure
        if (!parsedData.experimentData) {
            errors.push('Missing experimentData in parsed result');
            return {
                success: false,
                errors: [...baseValidation.errors, ...errors]
            };
        }

        const experimentData = parsedData.experimentData;

        // Check that we have tensile test data
        if (!experimentData.data || typeof experimentData.data !== 'object') {
            errors.push('Tensile test data section is missing or invalid');
        } else {
            // Check for required data sections
            if (!experimentData.data.traits || typeof experimentData.data.traits !== 'object') {
                errors.push('Tensile test traits section is missing or invalid');
            }

            if (!experimentData.data.channelData || typeof experimentData.data.channelData !== 'object') {
                errors.push('Tensile test channel data section is missing or invalid');
            }

            if (!experimentData.data.textFields || typeof experimentData.data.textFields !== 'object') {
                errors.push('Tensile test text fields section is missing or invalid');
            }
        }

        // Check format consistency
        if (parsedData.format !== 'EVOMECT150') {
            errors.push('Format must be EVOMECT150 for tensile test parser');
        }

        // Check experiment type
        if (experimentData.type !== 'tensile_test') {
            errors.push('Experiment type must be tensile_test for tensile test parser');
        }

        return {
            success: errors.length === 0,
            errors: [...baseValidation.errors, ...errors]
        };
    }
}

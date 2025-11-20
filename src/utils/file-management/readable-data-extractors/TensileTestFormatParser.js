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
                name: 'modulus',
                unit: 'Pa',
                description: 'Young\'s modulus (elasticity modulus) of the material'
            },
            {
                name: 'stressAtBreak',
                unit: 'Pa',
                description: 'Stress at which the specimen breaks'
            },
            {
                name: 'strainAtBreak',
                unit: 'mm/mm',
                description: 'Strain at which the specimen breaks'
            },
            {
                name: 'offsetYieldStress',
                unit: 'Pa',
                description: 'Stress at yield point using offset method'
            },
            {
                name: 'offsetYieldStrain',
                unit: 'Pa',
                description: 'Strain at yield point using offset method'
            },
            {
                name: 'toughness',
                unit: 'Pa',
                description: 'Material toughness (energy absorption capacity)'
            },
            {
                name: 'specimenDiameter',
                unit: 'um',
                description: 'Equivalent diameter of the test specimen'
            },
            {
                name: 'strainRate',
                unit: '1/s',
                description: 'Rate of strain applied during the test'
            },
            {
                name: 'loadAtBreak',
                unit: 'N',
                description: 'Calculated force at break (stress × cross-sectional area)'
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
            
            // Convert trait keys to camelCase for storage
            const camelCaseTraits = this.convertTraitKeysToCamelCase(extractedTraits);
            
            // Create experiment data structure
            const experimentData = this.createExperimentData({
                name: `TensileTest_${metadata?.filename?.replace(/\.[^/.]+$/, '') || 'unknown'}`,
                type: 'tensile_test',
                filename: metadata?.filename || 'unknown.txt',
                sampleId: textFields?.SpecimenName || '', // Will need to be mapped to actual sample
                notes: `Tensile test data with ${Object.keys(extractedTraits).length} traits and ${Object.keys(channelData).length} channels`,
                data: {
                    traits: camelCaseTraits,
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
        
        // Define trait type mappings - updated to match actual file variables
        const traitTypeMap = {
            'Modulus': 'modulus',
            'StressAtBreak': 'stressAtBreak',
            'StrainAtBreak': 'strainAtBreak',
            'OffsetYieldStress': 'offsetYieldStress',
            'OffsetYieldStrain': 'offsetYieldStrain',
            'Toughness': 'toughness',
            'SpecimenDiameter': 'specimenDiameter',
            'StrainRate': 'strainRate',
            'LoadAtBreak': 'loadAtBreak'
        };

        // Define output unit mappings - pressure values are already converted to Pa
        const unitMap = {
            'Modulus': 'Pa',
            'StressAtBreak': 'Pa',
            'StrainAtBreak': 'mm/mm',
            'OffsetYieldStress': 'Pa',
            'OffsetYieldStrain': 'Pa',
            'Toughness': 'Pa',
            'SpecimenDiameter': 'um',
            'StrainRate': '1/s',
            'LoadAtBreak': 'N'
        };

        Object.entries(extractedTraits).forEach(([traitName, value]) => {
            if (value !== null && value !== undefined && !isNaN(value)) {
                // Values are already converted in readTrait(), just use them directly
                traits.push({
                    method: "create",
                    type: traitTypeMap[traitName] || traitName,
                    sampleId: sampleId,
                    responsible: "", // Will be filled by the UI
                    date: date,
                    measurement: value,
                    unit: unitMap[traitName] || "",
                    equipment: "UTM T150",
                    detail: "",
                    notes: ``
                });
            }
        });

        return traits;
    }

    /**
     * Convert trait keys from PascalCase to camelCase
     */
    convertTraitKeysToCamelCase(extractedTraits) {
        const traitTypeMap = {
            'Modulus': 'modulus',
            'StressAtBreak': 'stressAtBreak',
            'StrainAtBreak': 'strainAtBreak',
            'OffsetYieldStress': 'offsetYieldStress',
            'OffsetYieldStrain': 'offsetYieldStrain',
            'Toughness': 'toughness',
            'SpecimenDiameter': 'specimenDiameter',
            'StrainRate': 'strainRate',
            'LoadAtBreak': 'loadAtBreak'
        };

        const camelCaseTraits = {};
        Object.entries(extractedTraits).forEach(([key, value]) => {
            const camelKey = traitTypeMap[key] || key;
            camelCaseTraits[camelKey] = value;
        });

        return camelCaseTraits;
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
        // Updated trait names to match actual file variables (lines 6-17)
        const traitNames = [
            'Modulus',              // Line 16: Modulus 9.581 GPa
            'StressAtBreak',        // Line 12: StressAtBreak 1126.972 MPa
            'StrainAtBreak',        // Line 11: StrainAtBreak 0.322 mm/mm
            'OffsetYieldStress',    // Line 15: OffsetYieldStress 279.674 MPa
            'OffsetYieldStrain',    // Line 14: OffsetYieldStrain 0.292 MPa
            'Toughness',            // Line 13: Toughness 218.498 MPa
            'SpecimenDiameter',     // Line 8: SpecimenDiameter 0.991 um
            'StrainRate'            // Line 9: StrainRate 1.000e-02 1/s
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

        // Calculate LoadAtBreak if we have both StressAtBreak and SpecimenDiameter
        // Formula: Force = Stress × Area
        // Area = π × (diameter/2)²
        // Units: StressAtBreak is already converted to Pa, Diameter is in um
        // Result will be in N (Newtons)
        if (traits.StressAtBreak && traits.SpecimenDiameter) {
            const stressAtBreak = traits.StressAtBreak; // Pa
            const diameter = traits.SpecimenDiameter;   // um
            
            // Calculate area: π × (d/2)² in um²
            const radius = diameter / 2;
            const areaInUm2 = Math.PI * radius * radius; // um²
            
            // Convert area from um² to m²
            // 1 um² = 1e-12 m²
            const areaInM2 = areaInUm2 * 1e-12;
            
            // Force = Stress × Area
            // Stress is in Pa (N/m²), Area is in m²
            const forceInN = stressAtBreak * areaInM2; // N
            
            traits.LoadAtBreak = forceInN;
        }

        return traits;
    }

    /**
     * Extract text fields from the file content
     * Replaces the old read_text function
     */
    extractTextFields(content) {
        // Text field names from the file
        const textNames = [
            'SpecimenName',                       // Line 7: SpecimenName B_4_IS
            'TestMethod',                         // Line 3: TestMethod,Standard Greifswald Tensile Silk Testing.msm
            'TimeAtBeginningOfTheExperiment'      // Line 10: TimeAtBeginningOfTheExperiment 10:39:12 AM
        ];

        const textFields = {};

        // Special handling for SpecimenName - just extract the value after the name
        const specimenMatch = content.match(/SpecimenName\s+([^\r\n]+)/);
        if (specimenMatch) {
            textFields.SpecimenName = specimenMatch[1].trim();
        }

        // Special handling for TestMethod - it's in CSV format on line 3
        const testMethodMatch = content.match(/TestMethod,(.+)/);
        if (testMethodMatch) {
            textFields.TestMethod = testMethodMatch[1].trim();
        }

        // Special handling for TimeAtBeginningOfTheExperiment
        const timeMatch = content.match(/TimeAtBeginningOfTheExperiment\s+(.+)/);
        if (timeMatch) {
            textFields.TimeAtBeginningOfTheExperiment = timeMatch[1].trim();
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
     * Updated to handle multiple unit types from the file and convert to standard units
     */
    readTrait(text, trait) {
        try {
            const position = text.search(trait);
            if (position === -1) return null;

            const startPos = position + trait.length;
            const output = text.substr(startPos, 50); // Read reasonable chunk
            const outputSplit = output.split(/\r| |\n/);
            
            // Filter out empty strings
            const parts = outputSplit.filter(s => s.trim() !== '');
            
            if (parts.length < 2) return null;

            const rawValue = parseFloat(parts[0]);
            
            if (isNaN(rawValue)) return null;

            // Unit is in the second part (if it exists)
            const unit = parts[1] || '';
            
            // Apply unit conversion based on what's in the file
            const conversionFactor = this.getConversionFactor(unit);
            const convertedValue = rawValue * conversionFactor;
            
            return convertedValue;

        } catch (error) {
            console.warn(`Error reading trait ${trait}:`, error.message);
            return null;
        }
    }

    /**
     * Get conversion factor based on the unit in the file
     * Converts pressure units to Pa, keeps other units unchanged
     */
    getConversionFactor(unit) {
        if (!unit) return 1;
        
        const unitLower = unit.toLowerCase();
        
        // Pressure unit conversions to Pa
        if (unitLower === 'gpa') return 1e9;   // GigaPascal to Pascal
        if (unitLower === 'mpa') return 1e6;   // MegaPascal to Pascal
        if (unitLower === 'kpa') return 1e3;   // KiloPascal to Pascal
        if (unitLower === 'pa') return 1;      // Already in Pascal
        
        // Other units - no conversion needed
        if (unitLower === 'um' || unitLower === 'μm') return 1;  // micrometers
        if (unitLower === 'mm' || unitLower === 'mm/mm') return 1;  // millimeters or strain
        if (unitLower === '1/s' || unitLower === 's^-1') return 1;  // per second
        if (unitLower === 'mn') return 1;  // milliNewtons
        
        // Default: no conversion
        return 1;
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

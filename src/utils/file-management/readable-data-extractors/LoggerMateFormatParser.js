/**
 * LoggerMate Format Parser
 * 
 * Parses wireless datalogger files with temperature, GPS, and accelerometer data.
 * Handles the specific format used by LoggerMate devices.
 */

import { BaseDataFormatParser } from './BaseDataFormatParser.js';

export class LoggerMateFormatParser extends BaseDataFormatParser {
    constructor() {
        super();
        this.name = 'LoggerMateFormatParser';
        this.label = 'LoggerMate Parser';
        this.supportedFormats = ['.txt', '.csv', '.log'];
        this.version = '1.0.0';
        this.description = 'Parses LoggerMate wireless datalogger files containing temperature, GPS, and accelerometer data';
        this.author = 'EvoNEST Team';
        
        // NEW: Parser-specific metadata for automatic discovery
        this.supportedExperimentTypes = ['temperature_monitoring'];
        this.primaryExperimentType = 'temperature_monitoring';
        this.requiredFields = ['temperature', 'timestamp'];
        this.generatedTraits = [
            {
                name: 'temperature',
                unit: '°C',
                description: 'Temperature measurements from wireless datalogger'
            },
            {
                name: 'gps_latitude',
                unit: 'degrees',
                description: 'GPS latitude coordinates'
            },
            {
                name: 'gps_longitude',
                unit: 'degrees',
                description: 'GPS longitude coordinates'
            },
            {
                name: 'accelerometer_x',
                unit: 'g',
                description: 'X-axis acceleration data'
            },
            {
                name: 'accelerometer_y',
                unit: 'g',
                description: 'Y-axis acceleration data'
            },
            {
                name: 'accelerometer_z',
                unit: 'g',
                description: 'Z-axis acceleration data'
            }
        ];
    }

    /**
     * Detect if this parser can handle the given data
     * Look for LoggerMate-specific patterns in the content
     */
    canParse(rawData, fileMetadata) {
        if (typeof rawData !== 'string') {
            return false;
        }

        // Check for LoggerMate-specific markers
        const loggerMateMarkers = [
            'WIRELESS DATALOGGER DATA DOWNLOAD',
            '########## METADATA ##########',
            '########## DEBUG ##########',
            '########## DATA ##########',
            'DEVICE_ID,',
            'MAC,',
            'SAMPLE_TIME,'
        ];

        return loggerMateMarkers.some(marker => rawData.includes(marker));
    }

    /**
     * Parse LoggerMate format into structured data
     */
    parse(rawData, fileMetadata) {
        if (typeof rawData !== 'string') {
            throw new Error('LoggerMate parser expects string data');
        }

        this.log(`Parsing LoggerMate format from file: ${fileMetadata?.filename || 'unknown'}`);

        try {
            // Extract metadata section
            const metadata = this.extractMetadataSection(
                rawData, 
                '########## METADATA ##########', 
                '########## DEBUG ##########'
            );

            // Extract debug information
            const debugInfo = this.extractMetadataSection(
                rawData, 
                '########## DEBUG ##########', 
                '########## DATA ##########'
            );

            // Extract data section
            const dataSection = this.extractDataSection(rawData);

            // Generate summary statistics
            const summary = this.generateSummary(dataSection.data, dataSection.columns);

            // Create the standardized experiment data structure
            const currentDate = new Date().toISOString();
            const experimentData = {
                name: `LoggerMate_${fileMetadata?.filename?.replace(/\.[^/.]+$/, '') || 'unknown'}`,
                sampleId: metadata.DEVICE_ID || '', // Will need to be mapped to actual sample
                responsible: '', // Will be filled by the UI
                type: 'temperature_monitoring',
                date: currentDate,
                notes: `LoggerMate data with ${dataSection.data.length} temperature readings`,
                filename: fileMetadata?.filename || 'unknown.txt',
                filepath: '', // Will be set when file is saved
                fileId: '', // Will be set when file is saved
                version: 1,
                conversionHistory: [],
                recentChangeDate: currentDate,
                logbook: [[currentDate, `Parsed LoggerMate data from ${fileMetadata?.filename || 'unknown'}`]],
                data: {
                    raw: dataSection.data,
                    metadata: metadata,
                    debugInfo: debugInfo,
                    summary: summary,
                    columns: dataSection.columns
                }
            };

            // Extract traits from temperature data
            const traits = this.extractTraits(dataSection.data, experimentData.sampleId, currentDate);
            if (traits.length > 0) {
                experimentData.traits = traits;
            }

            const result = {
                format: 'LoggerMate',
                suggestedExperimentType: 'temperature_monitoring',
                experimentData: experimentData,
                parsingMetadata: {
                    confidence: 0.95,
                    autoDetectedReason: 'LoggerMate file detected with temperature data',
                    alternativeTypes: ['environmental_monitoring', 'data_logging'],
                    parsedAt: currentDate
                }
            };

            this.log(`Successfully parsed LoggerMate data: ${dataSection.data.length} records`);
            return result;

        } catch (error) {
            this.log(`Error parsing LoggerMate format: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Extract the data section and parse it as CSV
     */
    extractDataSection(content) {
        const dataMarker = '########## DATA ##########';
        const dataStartIndex = content.indexOf(dataMarker);
        
        if (dataStartIndex === -1) {
            throw new Error('Data section not found in LoggerMate file');
        }

        const dataContent = content.substring(dataStartIndex + dataMarker.length);
        const lines = dataContent.trim().split('\n');
        
        if (lines.length < 2) {
            throw new Error('No data found in LoggerMate file');
        }

        // First line should be headers
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Parse data lines
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = line.split(',').map(v => v.trim());
                const row = {};
                
                headers.forEach((header, index) => {
                    row[header] = this.parseValue(values[index]);
                });
                
                data.push(row);
            }
        }

        return {
            columns: headers,
            data: data
        };
    }

    /**
     * Extract traits from LoggerMate temperature data
     */
    extractTraits(data, sampleId, date) {
        const traits = [];
        
        if (!data || data.length === 0) {
            return traits;
        }

        // Extract temperature measurements as traits
        data.forEach((record, index) => {
            if (record.TEMPERATURE && typeof record.TEMPERATURE === 'number') {
                traits.push({
                    method: "create",
                    type: "temperature",
                    sampleId: sampleId,
                    responsible: "", // Will be filled by the UI
                    date: date,
                    measurement: record.TEMPERATURE,
                    unit: "°C",
                    equipment: "LoggerMate",
                    detail: `Sample ${record.SAMPLE_NUM || index + 1}`,
                    notes: `Recorded at ${record.DAY || 'unknown'}/${record.HOUR || 'unknown'}:${record.MINUTE || 'unknown'}:${record.SECOND || 'unknown'}`
                });
            }
        });

        return traits;
    }

    /**
     * Generate summary statistics for the parsed data
     */
    generateSummary(data, columns) {
        if (!data || data.length === 0) {
            return {};
        }

        const summary = {
            recordCount: data.length,
            timeRange: {},
            measurements: {}
        };

        // Calculate time range
        if (data.length > 0) {
            const firstRecord = data[0];
            const lastRecord = data[data.length - 1];
            
            summary.timeRange = {
                start: {
                    day: firstRecord.DAY,
                    hour: firstRecord.HOUR,
                    minute: firstRecord.MINUTE,
                    second: firstRecord.SECOND
                },
                end: {
                    day: lastRecord.DAY,
                    hour: lastRecord.HOUR,
                    minute: lastRecord.MINUTE,
                    second: lastRecord.SECOND
                },
                duration: lastRecord.SAMPLE_NUM - firstRecord.SAMPLE_NUM
            };
        }

        // Calculate statistics for numeric columns
        const numericColumns = ['TEMPERATURE', 'RSSI', 'SAMPLE_NUM'];
        
        numericColumns.forEach(column => {
            if (columns.includes(column)) {
                const values = data.map(row => row[column]).filter(v => typeof v === 'number');
                
                if (values.length > 0) {
                    summary.measurements[column] = {
                        min: Math.min(...values),
                        max: Math.max(...values),
                        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
                        count: values.length
                    };
                }
            }
        });

        return summary;
    }

    /**
     * Validate the parsed LoggerMate data
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

        // Check required experiment fields
        const requiredFields = ['name', 'type', 'filename'];
        requiredFields.forEach(field => {
            if (!experimentData[field]) {
                errors.push(`Required experiment field missing: ${field}`);
            }
        });

        // Check that we have data
        if (!experimentData.data || !experimentData.data.raw || !Array.isArray(experimentData.data.raw)) {
            errors.push('LoggerMate data section is missing or invalid');
        }

        // Check for required metadata fields (relaxed validation)
        if (experimentData.data && experimentData.data.metadata) {
            const requiredMetadata = ['DEVICE_ID'];
            requiredMetadata.forEach(field => {
                if (!(field in experimentData.data.metadata)) {
                    errors.push(`Required metadata field missing: ${field}`);
                }
            });
        }

        // Check data structure
        if (experimentData.data && experimentData.data.raw && experimentData.data.raw.length > 0) {
            const firstRow = experimentData.data.raw[0];
            const requiredDataFields = ['SAMPLE_NUM'];
            
            requiredDataFields.forEach(field => {
                if (!(field in firstRow)) {
                    errors.push(`Required data field missing: ${field}`);
                }
            });
        }

        return {
            success: errors.length === 0,
            errors: [...baseValidation.errors, ...errors]
        };
    }
}

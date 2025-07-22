/**
 * CSV Format Parser
 * 
 * Generic parser for CSV files with customizable delimiters and headers.
 * Can handle various CSV formats commonly used in scientific data.
 * 
 * Returns ParsedDataResult with:
 * - format: 'CSV'
 * - suggestedExperimentType: 'tabular_data'
 * - experimentData: Complete experiment object with parsed CSV data
 * - parsingMetadata: Confidence and detection information
 */

import { BaseDataFormatParser } from './BaseDataFormatParser.js';

export class CSVFormatParser extends BaseDataFormatParser {
    constructor() {
        super();
        this.name = 'CSVFormatParser';
        this.label = 'CSV Parser';
        this.supportedFormats = ['.csv'];
        this.version = '1.0.0';
        this.description = 'Generic CSV parser with customizable delimiters and header detection';
        this.author = 'Daniele Liprandi';
        
        this.requiresStructuredData = true; 
        this.supportedExperimentTypes = ['tabular_data'];
        this.primaryExperimentType = 'tabular_data';
        this.requiredFields = []; // CSV can have any fields
        this.generatedTraits = [
            {
                name: 'row_count',
                unit: 'count',
                description: 'Number of data rows in the CSV file'
            },
            {
                name: 'column_count',
                unit: 'count',
                description: 'Number of columns in the CSV file'
            },
            {
                name: 'delimiter',
                unit: 'string',
                description: 'Detected delimiter character (comma, semicolon, tab, etc.)'
            },
            {
                name: 'header_detected',
                unit: 'boolean',
                description: 'Whether headers were detected in the first row'
            }
        ];
    }

    /**
     * Detect if this parser can handle the given data
     * Look for CSV-like patterns
     */
    canParse(rawData, fileMetadata) {
        if (typeof rawData !== 'string') {
            return false;
        }

        // Check file extension
        const filename = fileMetadata?.filename?.toLowerCase() || '';
        const hasCSVExtension = this.supportedFormats.some(format => 
            filename.endsWith(format)
        );

        if (!hasCSVExtension) {
            return false;
        }

        // Check for CSV-like structure
        const lines = rawData.trim().split('\n');
        if (lines.length < 2) {
            return false;
        }

        // Look for delimiter patterns
        const delimiters = [',', '\t', ';', '|'];
        const firstLine = lines[0];
        
        return delimiters.some(delimiter => {
            const parts = firstLine.split(delimiter);
            return parts.length >= 2; // At least 2 columns
        });
    }

    /**
     * Parse CSV format into structured data
     */
    parse(rawData, fileMetadata, options = {}) {
        if (typeof rawData !== 'string') {
            throw new Error('CSV parser expects string data');
        }

        this.log(`Parsing CSV format from file: ${fileMetadata?.filename || 'unknown'}`);

        const {
            delimiter = this.detectDelimiter(rawData),
            hasHeaders = true,
            skipRows = 0,
            maxRows = null
        } = options;

        try {
            const lines = rawData.trim().split('\n');
            
            // Skip specified rows
            const processedLines = lines.slice(skipRows);
            
            if (processedLines.length === 0) {
                throw new Error('No data lines found after skipping rows');
            }

            let columns = [];
            
            // Extract headers
            if (hasHeaders) {
                columns = processedLines[0].split(delimiter).map(h => h.trim());
                processedLines.shift(); // Remove header line
            }

            // Parse data rows
            const dataLines = maxRows ? processedLines.slice(0, maxRows) : processedLines;
            const parsedData = [];
            
            dataLines.forEach((line, index) => {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                    const values = trimmedLine.split(delimiter).map(v => v.trim());
                    
                    if (hasHeaders && columns.length > 0) {
                        const row = {};
                        columns.forEach((header, i) => {
                            row[header] = this.parseValue(values[i]);
                        });
                        parsedData.push(row);
                    } else {
                        parsedData.push(values.map(v => this.parseValue(v)));
                    }
                }
            });

            // Generate summary
            const summary = this.generateSummary(parsedData, columns);

            // Create experiment data structure
            const experimentData = this.createExperimentData({
                name: `CSV_${fileMetadata?.filename?.replace(/\.[^/.]+$/, '') || 'unknown'}`,
                type: 'tabular_data',
                filename: fileMetadata?.filename || 'unknown.csv',
                notes: `CSV data with ${parsedData.length} records and ${columns.length} columns`,
                data: {
                    raw: parsedData,
                    columns: columns,
                    summary: summary,
                    parsingOptions: {
                        delimiter: delimiter,
                        hasHeaders: hasHeaders,
                        skipRows: skipRows,
                        maxRows: maxRows
                    }
                }
            });

            // Extract traits if numeric columns are detected
            const traits = this.extractTraitsFromCSV(parsedData, columns, experimentData.sampleId, experimentData.date);
            if (traits.length > 0) {
                experimentData.traits = traits;
            }

            // Create the result using the new ParsedDataResult structure
            const result = this.createParsedDataResult({
                format: 'CSV',
                suggestedExperimentType: 'tabular_data',
                experimentData: experimentData,
                confidence: 0.85,
                autoDetectedReason: `CSV format detected with ${columns.length} columns and ${parsedData.length} rows`,
                alternativeTypes: []
            });

            this.log(`Successfully parsed CSV data: ${parsedData.length} records, ${columns.length} columns`);
            return result;

        } catch (error) {
            this.log(`Error parsing CSV format: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Extract traits from CSV numeric data
     */
    extractTraitsFromCSV(data, columns, sampleId, date) {
        const traits = [];
        
        if (!data || data.length === 0 || !columns || columns.length === 0) {
            return traits;
        }

        // Identify numeric columns
        const numericColumns = columns.filter(column => {
            const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined);
            const numericValues = values.filter(v => typeof v === 'number');
            return numericValues.length > values.length * 0.8; // 80% of values are numeric
        });

        // Extract measurements from numeric columns
        numericColumns.forEach(column => {
            data.forEach((row, index) => {
                const value = row[column];
                if (typeof value === 'number' && !isNaN(value)) {
                    traits.push({
                        method: "create",
                        type: "measurement",
                        sampleId: sampleId,
                        responsible: "", // Will be filled by the UI
                        date: date,
                        measurement: value,
                        unit: "", // Could be enhanced to detect units from column names
                        equipment: "CSV_import",
                        detail: column,
                        notes: `Row ${index + 1} from CSV import`
                    });
                }
            });
        });

        return traits;
    }

    /**
     * Detect the most likely delimiter in the CSV data
     */
    detectDelimiter(data) {
        const lines = data.trim().split('\n');
        if (lines.length === 0) {
            return ',';
        }

        const delimiters = [',', '\t', ';', '|'];
        const firstLine = lines[0];
        
        // Count occurrences of each delimiter
        const delimiterCounts = delimiters.map(delimiter => ({
            delimiter,
            count: (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length
        }));

        // Find the delimiter with the most occurrences
        const bestDelimiter = delimiterCounts.reduce((best, current) => 
            current.count > best.count ? current : best
        );

        return bestDelimiter.count > 0 ? bestDelimiter.delimiter : ',';
    }

    /**
     * Generate summary statistics for the parsed data
     */
    generateSummary(data, columns) {
        if (!data || data.length === 0) {
            return { recordCount: 0 };
        }

        const summary = {
            recordCount: data.length,
            columnCount: columns.length,
            columnTypes: {},
            numericStats: {}
        };

        // Analyze column types and calculate statistics
        if (columns.length > 0 && data.length > 0) {
            columns.forEach(column => {
                const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined);
                
                if (values.length === 0) {
                    summary.columnTypes[column] = 'empty';
                    return;
                }

                // Determine column type
                const numericValues = values.filter(v => typeof v === 'number');
                const stringValues = values.filter(v => typeof v === 'string');
                const booleanValues = values.filter(v => typeof v === 'boolean');

                if (numericValues.length > values.length * 0.8) {
                    summary.columnTypes[column] = 'numeric';
                    summary.numericStats[column] = {
                        min: Math.min(...numericValues),
                        max: Math.max(...numericValues),
                        avg: numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length,
                        count: numericValues.length
                    };
                } else if (booleanValues.length > values.length * 0.8) {
                    summary.columnTypes[column] = 'boolean';
                } else {
                    summary.columnTypes[column] = 'text';
                }
            });
        }

        return summary;
    }

    /**
     * Validate the parsed CSV data
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

        // Check that we have data
        if (!experimentData.data || !experimentData.data.raw || !Array.isArray(experimentData.data.raw)) {
            errors.push('CSV data section is missing or invalid');
        }

        if (!experimentData.data.columns || !Array.isArray(experimentData.data.columns)) {
            errors.push('CSV columns information is missing or invalid');
        }

        // Check consistency between data and columns
        if (experimentData.data && experimentData.data.raw && experimentData.data.raw.length > 0 && experimentData.data.columns) {
            const firstRow = experimentData.data.raw[0];
            if (typeof firstRow === 'object' && !Array.isArray(firstRow)) {
                const dataColumns = Object.keys(firstRow);
                const missingColumns = experimentData.data.columns.filter(col => !dataColumns.includes(col));
                
                if (missingColumns.length > 0) {
                    errors.push(`Data missing for columns: ${missingColumns.join(', ')}`);
                }
            }
        }

        // Validate parsing options if present
        if (experimentData.data.parsingOptions) {
            const options = experimentData.data.parsingOptions;
            if (options.delimiter && typeof options.delimiter !== 'string') {
                errors.push('Parsing options delimiter must be a string');
            }
            if (options.hasHeaders !== undefined && typeof options.hasHeaders !== 'boolean') {
                errors.push('Parsing options hasHeaders must be a boolean');
            }
        }

        return {
            success: errors.length === 0,
            errors: [...baseValidation.errors, ...errors]
        };
    }
}

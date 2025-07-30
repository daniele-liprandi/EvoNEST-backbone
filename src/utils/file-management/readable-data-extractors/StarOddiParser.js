/**
 * STAR-ODDI Format Parser
 * 
 * Parses STAR-ODDI logger files (typically .DAT files) containing temperature,
 * heart rate, and quality index data from DST micro-HRT devices.
 * 
 * Handles Windows-1252 encoding and the specific STAR-ODDI Mercury format.
 */

import { BaseDataFormatParser } from './BaseDataFormatParser.js';

export class StarOddiParser extends BaseDataFormatParser {
    constructor() {
        super();
        this.name = 'StarOddiParser';
        this.label = 'STAR-ODDI Logger Parser';
        this.supportedFormats = ['.dat', '.DAT'];
        this.version = '1.0.0';
        this.description = 'Parses STAR-ODDI DST micro-HRT logger files with temperature, heart rate, and quality index data';
        this.author = 'Daniele Liprandi';
        
        this.requiresStructuredData = true;
        this.supportedExperimentTypes = ['physiological_monitoring'];
        this.primaryExperimentType = 'physiological_monitoring';
        this.requiredFields = ['timestamp', 'temperature'];
        this.generatedTraits = [
            {
                name: 'temperature',
                unit: '°C',
                description: 'Temperature measurements from STAR-ODDI logger'
            },
            {
                name: 'heart_rate',
                unit: 'bpm',
                description: 'Heart rate measurements in beats per minute'
            },
            {
                name: 'quality_index',
                unit: 'index',
                description: 'Quality index for measurement reliability (0=good, 1=ok, 3=poor)'
            }
        ];
    }

    /**
     * Detect if this parser can handle the given data
     * Look for STAR-ODDI-specific patterns in the content
     */
    canParse(rawData, fileMetadata) {
        if (typeof rawData !== 'string') {
            return false;
        }

        // Check for STAR-ODDI-specific markers
        const starOddiMarkers = [
            '#B\tCreated:',
            '##\tVersion\tMercury',
            '##\tRecorder\t',
            'DST micro-HRT',
            'Temperature(°C)',
            'Heart rate(bpm)',
            '#D\tData:'
        ];

        // Also check file extension
        const filename = fileMetadata?.filename || '';
        const hasCorrectExtension = filename.toLowerCase().endsWith('.dat');

        // Require both format markers and correct extension for high confidence
        const hasMarkers = starOddiMarkers.some(marker => rawData.includes(marker));
        
        return hasCorrectExtension && hasMarkers;
    }

    /**
     * Parse STAR-ODDI format into structured data
     */
    parse(rawData, fileMetadata) {
        if (typeof rawData !== 'string') {
            throw new Error('STAR-ODDI parser expects string data');
        }

        this.log(`Parsing STAR-ODDI format from file: ${fileMetadata?.filename || 'unknown'}`);

        try {
            // Parse the file structure
            const parsedStructure = this.parseStarOddiStructure(rawData);
            
            // Extract measurements and calculate traits
            const measurements = this.extractMeasurements(parsedStructure.dataSection);
            const currentDate = new Date().toISOString();
            const traits = this.calculateTraits(measurements, '', currentDate);
            
            // Generate experiment name
            const experimentName = this.generateExperimentName(fileMetadata, parsedStructure.metadata);
            
            // Create experiment data structure
            const experimentData = this.createExperimentData({
                name: experimentName,
                type: this.primaryExperimentType,
                filename: fileMetadata?.filename,
                notes: this.generateNotes(parsedStructure.metadata, measurements),
                data: {
                    format: 'STAR-ODDI Mercury',
                    metadata: parsedStructure.metadata,
                    measurements: measurements,
                    summary: {
                        totalMeasurements: measurements.length,
                        dateRange: this.getDateRange(measurements),
                        samplingInterval: this.calculateSamplingInterval(measurements)
                    }
                },
                traits: traits
            });

            // Return structured result
            return this.createParsedDataResult({
                format: 'STAR-ODDI Mercury',
                suggestedExperimentType: this.primaryExperimentType,
                experimentData: experimentData,
                confidence: 0.95,
                autoDetectedReason: 'STAR-ODDI Mercury format detected with temperature and heart rate data',
                alternativeTypes: this.supportedExperimentTypes.filter(t => t !== this.primaryExperimentType)
            });

        } catch (error) {
            this.log(`Error parsing STAR-ODDI data: ${error.message}`, 'error');
            throw new Error(`Failed to parse STAR-ODDI data: ${error.message}`);
        }
    }

    /**
     * Parse the overall structure of a STAR-ODDI file
     */
    parseStarOddiStructure(rawData) {
        const lines = rawData.split('\n').map(line => line.trim());
        const metadata = {};
        let dataStartIndex = -1;

        // Parse metadata lines
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('#D\tData:')) {
                // Found data section header
                dataStartIndex = i + 1;
                
                // Parse data section info: #D	Data:	7613	07.02.2022 00:00:00	16.03.2022 10:10:00
                const dataParts = line.split('\t');
                if (dataParts.length >= 5) {
                    metadata.totalRecords = parseInt(dataParts[2]);
                    metadata.startDate = dataParts[3];
                    metadata.endDate = dataParts[4];
                }
                break;
            } else if (line.startsWith('#B\tCreated:')) {
                metadata.createdDate = line.split('\t')[2];
            } else if (line.startsWith('##\tVersion\t')) {
                const parts = line.split('\t');
                if (parts.length >= 4) {
                    metadata.softwareVersion = `${parts[2]} ${parts[3]}`;
                }
            } else if (line.startsWith('##\tRecorder\t')) {
                const parts = line.split('\t');
                if (parts.length >= 4) {
                    metadata.deviceType = parts[3];
                    metadata.deviceId = parts[4];
                }
            } else if (line.startsWith('#5\tField separation:')) {
                metadata.fieldSeparation = line.split('\t')[2];
            } else if (line.startsWith('#6\tDecimal point:')) {
                metadata.decimalPoint = line.split('\t')[2];
            } else if (line.startsWith('#35\tMS interval')) {
                metadata.measurementInterval = parseInt(line.split('\t')[2]);
            } else if (line.startsWith('#36\tFrequency Hz')) {
                metadata.frequency = parseInt(line.split('\t')[2]);
            } else if (line.startsWith('##\tAxis\t')) {
                // Parse axis definitions for understanding data columns
                if (!metadata.axes) metadata.axes = [];
                const parts = line.split('\t');
                if (parts.length >= 5) {
                    metadata.axes.push({
                        index: parseInt(parts[2]),
                        name: parts[3],
                        color: parts[4]
                    });
                }
            }
        }

        // Extract data section
        const dataSection = dataStartIndex > -1 ? lines.slice(dataStartIndex).filter(line => line.length > 0) : [];

        return {
            metadata,
            dataSection
        };
    }

    /**
     * Extract measurements from the data section
     */
    extractMeasurements(dataLines) {
        const measurements = [];

        for (const line of dataLines) {
            if (!line.trim()) continue;

            // Parse data line: "1	07.02.2022 00:00:00	7,10	25	0"
            const parts = line.split('\t');
            
            if (parts.length >= 5) {
                const measurement = {
                    recordNumber: parseInt(parts[0]),
                    timestamp: this.parseStarOddiDate(parts[1]),
                    temperature: this.parseStarOddiNumber(parts[2]),
                    heartRate: parseInt(parts[3]),
                    qualityIndex: parseInt(parts[4])
                };

                // Validate measurement
                if (measurement.timestamp && !isNaN(measurement.temperature)) {
                    measurements.push(measurement);
                }
            }
        }

        return measurements;
    }

    /**
     * Parse STAR-ODDI date format (dd.mm.yyyy HH:mm:ss)
     */
    parseStarOddiDate(dateString) {
        try {
            // Convert dd.mm.yyyy HH:mm:ss to ISO format
            const [datePart, timePart] = dateString.split(' ');
            const [day, month, year] = datePart.split('.');
            const [hour, minute, second] = timePart.split(':');
            
            // Create ISO date string
            const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
            return new Date(isoString).toISOString();
        } catch (error) {
            this.log(`Error parsing date "${dateString}": ${error.message}`, 'warn');
            return null;
        }
    }

    /**
     * Parse STAR-ODDI number format (uses comma as decimal separator)
     */
    parseStarOddiNumber(numberString) {
        if (!numberString || numberString.trim() === '') return NaN;
        
        // Replace comma with dot for decimal separator
        const normalized = numberString.trim().replace(',', '.');
        const parsed = parseFloat(normalized);
        
        // Log suspicious values for debugging
        if (parsed < -50 || parsed > 50) {
            this.log(`Unusual temperature value parsed: "${numberString}" -> ${parsed}`, 'warn');
        }
        
        return parsed;
    }

    /**
     * Calculate traits from measurements
     */
    calculateTraits(measurements, sampleId, date) {
        if (measurements.length === 0) {
            return [];
        }

        const traits = [];

        // Temperature trait - filter out invalid readings
        const temperatures = measurements
            .map(m => m.temperature)
            .filter(t => !isNaN(t) && t > -50 && t < 50); // Reasonable temperature range
        
        if (temperatures.length > 0) {
            traits.push({
                method: "create",
                type: "temperature",
                sampleId: sampleId,
                responsible: "",
                date: date,
                measurement: this.calculateAverage(temperatures),
                std: this.calculateStandardDeviation(temperatures),
                min: Math.min(...temperatures),
                max: Math.max(...temperatures),
                listvals: temperatures,
                unit: "°C",
                equipment: "STAR-ODDI DST micro-HRT",
                detail: `Average temperature from ${temperatures.length} valid readings (range: ${Math.min(...temperatures)}°C to ${Math.max(...temperatures)}°C)`,
                notes: `Physiological monitoring period, ${measurements.length} total readings`
            });
        }

        // Heart rate trait - filter out invalid readings (heart rate of 1 is often an error code)
        const heartRates = measurements
            .map(m => m.heartRate)
            .filter(hr => !isNaN(hr) && hr > 10 && hr < 300); // Reasonable heart rate range
            
        if (heartRates.length > 0) {
            traits.push({
                method: "create",
                type: "heart_rate",
                sampleId: sampleId,
                responsible: "",
                date: date,
                measurement: this.calculateAverage(heartRates),
                std: this.calculateStandardDeviation(heartRates),
                min: Math.min(...heartRates),
                max: Math.max(...heartRates),
                listvals: heartRates,
                unit: "bpm",
                equipment: "STAR-ODDI DST micro-HRT",
                detail: `Average heart rate from ${heartRates.length} valid readings (range: ${Math.min(...heartRates)}-${Math.max(...heartRates)} bpm)`,
                notes: `Physiological monitoring period, ${measurements.length} total readings`
            });
        }

        // Quality index trait (average quality)
        const qualityIndices = measurements.map(m => m.qualityIndex).filter(qi => !isNaN(qi));
        if (qualityIndices.length > 0) {
            const avgQuality = this.calculateAverage(qualityIndices);
            const goodCount = qualityIndices.filter(qi => qi === 0).length;
            const okCount = qualityIndices.filter(qi => qi === 1).length;
            const poorCount = qualityIndices.filter(qi => qi === 3).length;
            
            traits.push({
                method: "create",
                type: "quality_index",
                sampleId: sampleId,
                responsible: "",
                date: date,
                measurement: avgQuality,
                std: this.calculateStandardDeviation(qualityIndices),
                min: Math.min(...qualityIndices),
                max: Math.max(...qualityIndices),
                listvals: qualityIndices,
                unit: "index",
                equipment: "STAR-ODDI DST micro-HRT",
                detail: `Signal quality: ${Math.round((goodCount / qualityIndices.length) * 100)}% good, ${Math.round((okCount / qualityIndices.length) * 100)}% ok, ${Math.round((poorCount / qualityIndices.length) * 100)}% poor`,
                notes: `Physiological monitoring period, ${qualityIndices.length} quality readings`
            });
        }

        return traits;
    }

    /**
     * Calculate average of an array of numbers
     */
    calculateAverage(numbers) {
        if (numbers.length === 0) return 0;
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }

    /**
     * Calculate standard deviation of an array of numbers
     */
    calculateStandardDeviation(numbers) {
        if (numbers.length === 0) return 0;
        if (numbers.length === 1) return 0;
        
        const avg = this.calculateAverage(numbers);
        const squaredDiffs = numbers.map(num => Math.pow(num - avg, 2));
        const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
        return Math.sqrt(avgSquaredDiff);
    }

    /**
     * Generate experiment name based on file metadata and device info
     */
    generateExperimentName(fileMetadata, metadata) {
        const filename = fileMetadata?.filename || 'star_oddi_data';
        const baseName = filename.replace(/\.(dat|DAT)$/, '');
        
        if (metadata.deviceId) {
            return `StarOddi_${metadata.deviceId}_${baseName}`;
        }
        
        return `StarOddi_${baseName}`;
    }

    /**
     * Generate descriptive notes about the experiment
     */
    generateNotes(metadata, measurements) {
        const notes = [`STAR-ODDI logger data parsed from ${metadata.softwareVersion || 'Mercury'} format.`];
        
        if (metadata.deviceType && metadata.deviceId) {
            notes.push(`Device: ${metadata.deviceType} (ID: ${metadata.deviceId})`);
        }
        
        if (measurements.length > 0) {
            notes.push(`${measurements.length} measurements recorded.`);
            
            const dateRange = this.getDateRange(measurements);
            if (dateRange.start && dateRange.end) {
                notes.push(`Recording period: ${dateRange.start} to ${dateRange.end}`);
            }
        }
        
        if (metadata.measurementInterval) {
            notes.push(`Sampling interval: ${metadata.measurementInterval}ms`);
        }
        
        return notes.join(' ');
    }

    /**
     * Get date range from measurements
     */
    getDateRange(measurements) {
        if (measurements.length === 0) {
            return { start: null, end: null };
        }
        
        const timestamps = measurements.map(m => m.timestamp).filter(t => t);
        if (timestamps.length === 0) {
            return { start: null, end: null };
        }
        
        timestamps.sort();
        return {
            start: new Date(timestamps[0]).toLocaleDateString(),
            end: new Date(timestamps[timestamps.length - 1]).toLocaleDateString()
        };
    }

    /**
     * Calculate average sampling interval
     */
    calculateSamplingInterval(measurements) {
        if (measurements.length < 2) return null;
        
        const intervals = [];
        for (let i = 1; i < measurements.length; i++) {
            const prev = new Date(measurements[i - 1].timestamp);
            const curr = new Date(measurements[i].timestamp);
            const interval = curr - prev;
            if (interval > 0) {
                intervals.push(interval);
            }
        }
        
        if (intervals.length === 0) return null;
        
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        return Math.round(avgInterval / (1000 * 60)); // Convert to minutes
    }
}

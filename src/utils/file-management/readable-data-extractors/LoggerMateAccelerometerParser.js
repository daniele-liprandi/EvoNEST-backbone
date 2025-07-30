/**
 * LoggerMate Accelerometer Format Parser
 * 
 * Parses LoggerMate accelerometer files containing X, Y, Z acceleration data
 * with time markers for movement and activity analysis.
 */

import { BaseDataFormatParser } from './BaseDataFormatParser.js';

export class LoggerMateAccelerometerParser extends BaseDataFormatParser {
    constructor() {
        super();
        this.name = 'LoggerMateAccelerometerParser';
        this.label = 'LoggerMate Accelerometer Parser';
        this.supportedFormats = ['.txt', '.csv', '.TXT', '.CSV'];
        this.version = '1.0.0';
        this.description = 'Parses LoggerMate accelerometer files with X, Y, Z acceleration data and time markers';
        this.author = "Daniele Liprandi";
        
        this.requiresStructuredData = true;
        this.supportedExperimentTypes = ['movement_tracking'];
        this.primaryExperimentType = 'movement_tracking';
        this.requiredFields = ['accel_x', 'accel_y', 'accel_z'];
        this.generatedTraits = [
            {
                name: 'total_acceleration',
                unit: 'g',
                description: 'Average total acceleration magnitude'
            },
            {
                name: 'movement_variance',
                unit: 'g²',
                description: 'Variance in acceleration indicating movement intensity'
            },
            {
                name: 'activity_periods',
                unit: 'count',
                description: 'Number of distinct activity periods detected'
            },
            {
                name: 'max_acceleration',
                unit: 'g',
                description: 'Maximum acceleration magnitude recorded'
            },
            {
                name: 'recording_duration',
                unit: 'seconds',
                description: 'Total duration of accelerometer recording'
            }
        ];
    }

    /**
     * Detect if this parser can handle the given data
     * Look for LoggerMate accelerometer-specific patterns
     */
    canParse(rawData, fileMetadata) {
        if (typeof rawData !== 'string') {
            return false;
        }

        // Check for accelerometer-specific header pattern
        const accelMarkers = [
            'ACCEL_X,ACCEL_Y,ACCEL_Z',
            'ACCEL_X, ACCEL_Y, ACCEL_Z'
        ];

        // Must have accelerometer header
        const hasAccelHeader = accelMarkers.some(marker => rawData.includes(marker));
        
        // Check for time markers with asterisks
        const hasTimeMarkers = /\*\*\*\d+,\d+,\d+\*\*\*/.test(rawData);
        
        // Check for numeric accelerometer data pattern
        const hasAccelData = /^-?\d+,-?\d+,-?\d+$/m.test(rawData);
        
        return hasAccelHeader && hasTimeMarkers && hasAccelData;
    }

    /**
     * Parse LoggerMate accelerometer format into structured data
     */
    parse(rawData, fileMetadata) {
        if (typeof rawData !== 'string') {
            throw new Error('LoggerMate Accelerometer parser expects string data');
        }

        this.log(`Parsing LoggerMate Accelerometer format from file: ${fileMetadata?.filename || 'unknown'}`);

        try {
            // Parse the accelerometer data
            const measurements = this.extractAccelerometerMeasurements(rawData);
            
            // Calculate traits and statistics
            const currentDate = new Date().toISOString();
            const traits = this.calculateAccelerometerTraits(measurements, '', currentDate);
            
            // Generate experiment name
            const experimentName = this.generateExperimentName(fileMetadata, measurements);
            
            // Create experiment data structure
            const experimentData = this.createExperimentData({
                name: experimentName,
                type: this.primaryExperimentType,
                filename: fileMetadata?.filename || 'accelerometer_data.txt',
                notes: this.generateNotes(measurements),
                data: {
                    format: 'LoggerMate Accelerometer',
                    measurements: measurements,
                    summary: {
                        totalMeasurements: measurements.length,
                        recordingDuration: this.getRecordingDuration(measurements),
                        samplingRate: this.calculateSamplingRate(measurements),
                        accelerationRange: this.getAccelerationRange(measurements),
                        timeMarkers: this.extractTimeMarkers(rawData)
                    }
                },
                traits: traits
            });

            // Return structured result
            return this.createParsedDataResult({
                format: 'LoggerMate Accelerometer',
                suggestedExperimentType: this.primaryExperimentType,
                experimentData: experimentData,
                confidence: 0.95,
                autoDetectedReason: 'LoggerMate accelerometer format detected with X,Y,Z data and time markers',
                alternativeTypes: this.supportedExperimentTypes.filter(t => t !== this.primaryExperimentType)
            });

        } catch (error) {
            this.log(`Error parsing LoggerMate Accelerometer data: ${error.message}`, 'error');
            throw new Error(`Failed to parse LoggerMate Accelerometer data: ${error.message}`);
        }
    }

    /**
     * Extract accelerometer measurements from raw data
     */
    extractAccelerometerMeasurements(rawData) {
        const lines = rawData.split('\n').map(line => line.trim());
        const measurements = [];
        let currentTimeSeconds = 0;
        let measurementIndex = 0;
        
        // Skip header line
        const dataLines = lines.slice(1).filter(line => line.length > 0);
        
        for (const line of dataLines) {
            // Check for time marker
            const timeMarkerMatch = line.match(/\*\*\*(\d+),(\d+),(\d+)\*\*\*/);
            if (timeMarkerMatch) {
                currentTimeSeconds = parseInt(timeMarkerMatch[1]);
                continue;
            }

            // Parse accelerometer data
            const values = line.split(',').map(v => v.trim());
            if (values.length === 3) {
                const accelX = parseInt(values[0]);
                const accelY = parseInt(values[1]);
                const accelZ = parseInt(values[2]);

                // Skip invalid readings
                if (isNaN(accelX) || isNaN(accelY) || isNaN(accelZ)) {
                    continue;
                }

                // Convert raw values to g-force (assuming typical accelerometer scaling)
                // Common scaling is 1024 counts per g for many accelerometers
                const scaleFactor = 1024;
                const gX = accelX / scaleFactor;
                const gY = accelY / scaleFactor;
                const gZ = accelZ / scaleFactor;

                // Calculate magnitude
                const magnitude = Math.sqrt(gX * gX + gY * gY + gZ * gZ);

                measurements.push({
                    index: measurementIndex++,
                    timeSeconds: currentTimeSeconds,
                    timestamp: this.createTimestamp(currentTimeSeconds),
                    accelX: accelX,
                    accelY: accelY,
                    accelZ: accelZ,
                    gX: gX,
                    gY: gY,
                    gZ: gZ,
                    magnitude: magnitude
                });
            }
        }

        return measurements;
    }

    /**
     * Extract time markers from the data for analysis
     */
    extractTimeMarkers(rawData) {
        const timeMarkers = [];
        const lines = rawData.split('\n');
        
        lines.forEach((line, lineNumber) => {
            const match = line.match(/\*\*\*(\d+),(\d+),(\d+)\*\*\*/);
            if (match) {
                timeMarkers.push({
                    lineNumber: lineNumber + 1,
                    timeSeconds: parseInt(match[1]),
                    value2: parseInt(match[2]),
                    value3: parseInt(match[3])
                });
            }
        });
        
        return timeMarkers;
    }

    /**
     * Create timestamp from seconds offset
     */
    createTimestamp(seconds) {
        // Create a base timestamp and add seconds
        const baseTime = new Date();
        baseTime.setHours(0, 0, 0, 0); // Start of day
        baseTime.setSeconds(baseTime.getSeconds() + seconds);
        return baseTime.toISOString();
    }

    /**
     * Calculate accelerometer-specific traits
     */
    calculateAccelerometerTraits(measurements, sampleId, date) {
        if (measurements.length === 0) {
            return [];
        }

        const traits = [];

        // Total acceleration (average magnitude)
        const magnitudes = measurements.map(m => m.magnitude);
        const avgMagnitude = this.calculateAverage(magnitudes);
        traits.push({
            method: "create",
            type: "total_acceleration",
            sampleId: sampleId,
            responsible: "",
            date: date,
            measurement: avgMagnitude,
            unit: "g",
            equipment: "LoggerMate Accelerometer",
            detail: `Average acceleration from ${magnitudes.length} measurements (range: ${Math.min(...magnitudes).toFixed(3)}-${Math.max(...magnitudes).toFixed(3)}g)`,
            notes: "Accelerometer monitoring period"
        });

        // Movement variance
        const variance = this.calculateVariance(magnitudes);
        traits.push({
            method: "create",
            type: "movement_variance",
            sampleId: sampleId,
            responsible: "",
            date: date,
            measurement: variance,
            unit: "g²",
            equipment: "LoggerMate Accelerometer",
            detail: `Movement variance (std dev: ${Math.sqrt(variance).toFixed(4)}g)`,
            notes: "Accelerometer monitoring period"
        });

        // Activity periods (periods with high variance)
        const activityPeriods = this.detectActivityPeriods(measurements);
        traits.push({
            method: "create",
            type: "activity_periods",
            sampleId: sampleId,
            responsible: "",
            date: date,
            measurement: activityPeriods.length,
            unit: "count",
            equipment: "LoggerMate Accelerometer",
            detail: `${activityPeriods.length} activity periods, total active time: ${activityPeriods.reduce((sum, period) => sum + period.duration, 0)}s`,
            notes: "Accelerometer monitoring period"
        });

        // Maximum acceleration
        const maxAcceleration = Math.max(...magnitudes);
        const maxIndex = magnitudes.indexOf(maxAcceleration);
        traits.push({
            method: "create",
            type: "max_acceleration",
            sampleId: sampleId,
            responsible: "",
            date: date,
            measurement: maxAcceleration,
            unit: "g",
            equipment: "LoggerMate Accelerometer",
            detail: `Maximum acceleration at ${measurements[maxIndex]?.timestamp || 'unknown time'}`,
            notes: "Accelerometer monitoring period"
        });

        // Recording duration
        const duration = this.getRecordingDuration(measurements);
        traits.push({
            method: "create",
            type: "recording_duration",
            sampleId: sampleId,
            responsible: "",
            date: date,
            measurement: duration,
            unit: "seconds",
            equipment: "LoggerMate Accelerometer",
            detail: `Recording duration: ${(duration / 3600).toFixed(2)} hours, ${(duration / 60).toFixed(1)} minutes`,
            notes: "Accelerometer monitoring period"
        });

        return traits;
    }

    /**
     * Detect activity periods based on acceleration variance
     */
    detectActivityPeriods(measurements) {
        const periods = [];
        const windowSize = 50; // Window size for variance calculation
        const threshold = 0.1; // Variance threshold for activity detection
        
        let inActivityPeriod = false;
        let periodStart = null;
        
        for (let i = 0; i < measurements.length - windowSize; i += windowSize) {
            const window = measurements.slice(i, i + windowSize);
            const windowMagnitudes = window.map(m => m.magnitude);
            const windowVariance = this.calculateVariance(windowMagnitudes);
            
            if (windowVariance > threshold && !inActivityPeriod) {
                // Start of activity period
                inActivityPeriod = true;
                periodStart = window[0].timeSeconds;
            } else if (windowVariance <= threshold && inActivityPeriod) {
                // End of activity period
                inActivityPeriod = false;
                periods.push({
                    start: periodStart,
                    end: window[0].timeSeconds,
                    duration: window[0].timeSeconds - periodStart,
                    variance: windowVariance
                });
            }
        }
        
        // Handle case where recording ends during an activity period
        if (inActivityPeriod && measurements.length > 0) {
            periods.push({
                start: periodStart,
                end: measurements[measurements.length - 1].timeSeconds,
                duration: measurements[measurements.length - 1].timeSeconds - periodStart,
                variance: threshold
            });
        }
        
        return periods;
    }

    /**
     * Calculate variance of an array of numbers
     */
    calculateVariance(numbers) {
        if (numbers.length === 0) return 0;
        
        const mean = this.calculateAverage(numbers);
        const squaredDiffs = numbers.map(x => Math.pow(x - mean, 2));
        return this.calculateAverage(squaredDiffs);
    }

    /**
     * Calculate average of an array of numbers
     */
    calculateAverage(numbers) {
        if (numbers.length === 0) return 0;
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }

    /**
     * Get recording duration in seconds
     */
    getRecordingDuration(measurements) {
        if (measurements.length === 0) return 0;
        
        const firstTime = measurements[0].timeSeconds;
        const lastTime = measurements[measurements.length - 1].timeSeconds;
        return lastTime - firstTime;
    }

    /**
     * Calculate sampling rate
     */
    calculateSamplingRate(measurements) {
        if (measurements.length < 2) return null;
        
        const duration = this.getRecordingDuration(measurements);
        if (duration === 0) return null;
        
        return measurements.length / duration; // Samples per second
    }

    /**
     * Get acceleration range across all axes
     */
    getAccelerationRange(measurements) {
        if (measurements.length === 0) {
            return { x: null, y: null, z: null, magnitude: null };
        }
        
        const xValues = measurements.map(m => m.gX);
        const yValues = measurements.map(m => m.gY);
        const zValues = measurements.map(m => m.gZ);
        const magnitudes = measurements.map(m => m.magnitude);
        
        return {
            x: { min: Math.min(...xValues), max: Math.max(...xValues) },
            y: { min: Math.min(...yValues), max: Math.max(...yValues) },
            z: { min: Math.min(...zValues), max: Math.max(...zValues) },
            magnitude: { min: Math.min(...magnitudes), max: Math.max(...magnitudes) }
        };
    }

    /**
     * Generate experiment name
     */
    generateExperimentName(fileMetadata, measurements) {
        const filename = fileMetadata?.filename || 'accelerometer_data';
        const baseName = filename.replace(/\.(txt|csv|TXT|CSV)$/, '');
        
        const duration = measurements.length > 0 ? this.getRecordingDuration(measurements) : 0;
        const durationStr = duration > 0 ? `_${Math.round(duration)}s` : '';
        
        return `LoggerMateAccel_${baseName}${durationStr}`;
    }

    /**
     * Generate descriptive notes
     */
    generateNotes(measurements) {
        const notes = ['LoggerMate accelerometer data with X, Y, Z acceleration measurements.'];
        
        if (measurements.length > 0) {
            const duration = this.getRecordingDuration(measurements);
            const samplingRate = this.calculateSamplingRate(measurements);
            
            notes.push(`${measurements.length} measurements recorded over ${Math.round(duration)} seconds.`);
            
            if (samplingRate) {
                notes.push(`Average sampling rate: ${samplingRate.toFixed(1)} Hz.`);
            }
            
            const range = this.getAccelerationRange(measurements);
            if (range.magnitude) {
                notes.push(`Acceleration range: ${range.magnitude.min.toFixed(2)} to ${range.magnitude.max.toFixed(2)} g.`);
            }
        }
        
        return notes.join(' ');
    }
}

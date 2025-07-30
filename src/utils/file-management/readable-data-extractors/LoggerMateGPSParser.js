/**
 * LoggerMate GPS Format Parser
 * 
 * Parses LoggerMate GPS data files containing location tracking information
 * with latitude, longitude, satellite count, and other GPS metrics.
 */

import { BaseDataFormatParser } from './BaseDataFormatParser.js';

export class LoggerMateGPSParser extends BaseDataFormatParser {
    constructor() {
        super();
        this.name = 'LoggerMateGPSParser';
        this.label = 'LoggerMate GPS Parser';
        this.supportedFormats = ['.txt', '.csv', '.TXT', '.CSV'];
        this.version = '1.0.0';
        this.description = 'Parses LoggerMate GPS tracking files with location coordinates and satellite data';
        this.author = "Daniele Liprandi";
        
        this.requiresStructuredData = true;
        this.supportedExperimentTypes = ['gps_tracking'];
        this.primaryExperimentType = 'gps_tracking';
        this.requiredFields = ['latitude', 'longitude', 'timestamp'];
        this.generatedTraits = [
            {
                name: 'location_accuracy',
                unit: 'meters',
                description: 'Average GPS accuracy based on HDOP values'
            },
            {
                name: 'tracking_duration',
                unit: 'hours',
                description: 'Total duration of GPS tracking session'
            },
            {
                name: 'distance_traveled',
                unit: 'meters',
                description: 'Total distance traveled between GPS points'
            },
            {
                name: 'average_satellites',
                unit: 'count',
                description: 'Average number of satellites used for positioning'
            }
        ];
    }

    /**
     * Detect if this parser can handle the given data
     * Look for LoggerMate GPS-specific patterns in the content
     */
    canParse(rawData, fileMetadata) {
        if (typeof rawData !== 'string') {
            return false;
        }

        // Check for GPS-specific header pattern
        const gpsMarkers = [
            'DATE,TIME,LATITUDE,LONGITUDE',
            'SATELLITES,HDOP',
            'TIME_TO_FIX,TIME_TO_TRACK',
            'GLOBAL_COUNTER,POS_AGE,DATETIME_AGE'
        ];

        // Must have GPS header and coordinate data
        const hasGpsHeader = gpsMarkers.some(marker => rawData.includes(marker));
        
        // Check for coordinate-like data (negative latitude around -31, longitude around 115 for Australia)
        const hasCoordinateData = /,-31\.\d+,115\.\d+,/.test(rawData);
        
        return hasGpsHeader && hasCoordinateData;
    }

    /**
     * Parse LoggerMate GPS format into structured data
     */
    parse(rawData, fileMetadata) {
        if (typeof rawData !== 'string') {
            throw new Error('LoggerMate GPS parser expects string data');
        }

        this.log(`Parsing LoggerMate GPS format from file: ${fileMetadata?.filename || 'unknown'}`);

        try {
            // Parse CSV data
            const lines = rawData.trim().split('\n');
            const headers = lines[0].split(',');
            const dataLines = lines.slice(1);

            // Parse GPS measurements
            const measurements = this.parseGPSMeasurements(dataLines, headers);
            
            // Calculate derived metrics and traits
            const metrics = this.calculateGPSMetrics(measurements);
            const currentDate = new Date().toISOString();
            const traits = this.calculateTraits(measurements, metrics, '', currentDate);
            
            // Generate experiment name
            const experimentName = this.generateExperimentName(fileMetadata, measurements);
            
            // Create experiment data structure
            const experimentData = this.createExperimentData({
                name: experimentName,
                type: this.primaryExperimentType,
                filename: fileMetadata?.filename || 'gps_data.txt',
                notes: this.generateNotes(measurements, metrics),
                data: {
                    format: 'LoggerMate GPS',
                    headers: headers,
                    measurements: measurements,
                    metrics: metrics,
                    summary: {
                        totalPoints: measurements.length,
                        dateRange: this.getDateRange(measurements),
                        boundingBox: this.getBoundingBox(measurements)
                    }
                },
                traits: traits
            });

            // Return structured result
            return this.createParsedDataResult({
                format: 'LoggerMate GPS',
                suggestedExperimentType: this.primaryExperimentType,
                experimentData: experimentData,
                confidence: 0.95,
                autoDetectedReason: 'LoggerMate GPS format detected with coordinate data',
                alternativeTypes: this.supportedExperimentTypes.filter(t => t !== this.primaryExperimentType)
            });

        } catch (error) {
            this.log(`Error parsing LoggerMate GPS data: ${error.message}`, 'error');
            throw new Error(`Failed to parse LoggerMate GPS data: ${error.message}`);
        }
    }

    /**
     * Parse GPS measurements from data lines
     */
    parseGPSMeasurements(dataLines, headers) {
        const measurements = [];

        for (const line of dataLines) {
            if (!line.trim()) continue;

            const values = line.split(',');
            if (values.length < headers.length) continue;

            try {
                const measurement = {};
                
                // Map each header to its value
                headers.forEach((header, index) => {
                    const value = values[index]?.trim(); // Trim whitespace and line endings
                    const cleanHeader = header.trim(); // Clean header too
                    
                    switch (cleanHeader.toUpperCase()) {
                        case 'DATE':
                            measurement.date = this.parseLoggerMateDate(value);
                            break;
                        case 'TIME':
                            measurement.time = this.parseLoggerMateTime(value);
                            break;
                        case 'LATITUDE':
                            measurement.latitude = parseFloat(value);
                            break;
                        case 'LONGITUDE':
                            measurement.longitude = parseFloat(value);
                            break;
                        case 'SATELLITES':
                            measurement.satellites = parseInt(value);
                            break;
                        case 'HDOP':
                            measurement.hdop = parseInt(value);
                            break;
                        case 'TIME_TO_FIX':
                            measurement.timeToFix = parseInt(value);
                            break;
                        case 'TIME_TO_TRACK':
                            measurement.timeToTrack = parseInt(value);
                            break;
                        case 'GLOBAL_COUNTER':
                            measurement.globalCounter = parseInt(value);
                            break;
                        case 'POS_AGE':
                            measurement.posAge = parseInt(value);
                            break;
                        case 'DATETIME_AGE':
                            measurement.datetimeAge = parseInt(value);
                            break;
                        default:
                            if (value && value !== '') {
                                measurement[cleanHeader.toLowerCase()] = value;
                            }
                    }
                });

                // Create combined timestamp
                if (measurement.date && measurement.time) {
                    measurement.timestamp = this.createTimestamp(measurement.date, measurement.time);
                }

                // Validate essential GPS data
                if (!isNaN(measurement.latitude) && !isNaN(measurement.longitude)) {
                    measurements.push(measurement);
                }

            } catch (error) {
                this.log(`Error parsing GPS measurement line: ${line}`, 'warn');
            }
        }

        return measurements;
    }

    /**
     * Parse LoggerMate date format (DMMYY or DDMMYY)
     */
    parseLoggerMateDate(dateString) {
        try {
            // Handle variable length date format - DMMYY where D can be 1-2 digits
            let day, month, year;
            
            if (dateString.length === 5) {
                // Format: DMMYY (e.g., 90325 = Day 9, Month 03, Year 25)
                day = parseInt(dateString.substring(0, 1));
                month = parseInt(dateString.substring(1, 3));
                year = parseInt(dateString.substring(3, 5));
            } else if (dateString.length === 6) {
                // Format: DDMMYY (e.g., 100325 = Day 10, Month 03, Year 25)
                day = parseInt(dateString.substring(0, 2));
                month = parseInt(dateString.substring(2, 4));
                year = parseInt(dateString.substring(4, 6));
            } else {
                throw new Error(`Unexpected date format: ${dateString}`);
            }
            
            // Convert 2-digit year to 4-digit year in 2000s
            const fullYear = 2000 + year;
            
            return { year: fullYear, month, day };
        } catch (error) {
            this.log(`Error parsing date "${dateString}": ${error.message}`, 'warn');
            return null;
        }
    }

    /**
     * Parse LoggerMate time format (HHMMSSCC where CC is centiseconds)
     */
    parseLoggerMateTime(timeString) {
        try {
            // Format: HHMMSSCC (11041100 = 11:04:11.00)
            const timeNum = parseInt(timeString);
            const hours = Math.floor(timeNum / 1000000);
            const minutes = Math.floor((timeNum % 1000000) / 10000);
            const seconds = Math.floor((timeNum % 10000) / 100);
            const centiseconds = timeNum % 100;
            
            return { hours, minutes, seconds, centiseconds };
        } catch (error) {
            this.log(`Error parsing time "${timeString}": ${error.message}`, 'warn');
            return null;
        }
    }

    /**
     * Create ISO timestamp from date and time components
     */
    createTimestamp(dateObj, timeObj) {
        if (!dateObj || !timeObj) return null;
        
        try {
            const date = new Date(
                dateObj.year,
                dateObj.month - 1, // JS months are 0-indexed
                dateObj.day,
                timeObj.hours,
                timeObj.minutes,
                timeObj.seconds,
                timeObj.centiseconds * 10 // Convert centiseconds to milliseconds
            );
            
            return date.toISOString();
        } catch (error) {
            this.log(`Error creating timestamp: ${error.message}`, 'warn');
            return null;
        }
    }

    /**
     * Calculate GPS metrics and derived data
     */
    calculateGPSMetrics(measurements) {
        if (measurements.length === 0) return {};

        const metrics = {
            totalDistance: 0,
            averageSpeed: 0,
            maxSpeed: 0,
            averageAccuracy: 0,
            averageSatellites: 0,
            trackingDuration: 0
        };

        // Calculate distances and speeds
        const distances = [];
        const speeds = [];
        let totalDistance = 0;

        for (let i = 1; i < measurements.length; i++) {
            const prev = measurements[i - 1];
            const curr = measurements[i];

            if (prev.latitude && prev.longitude && curr.latitude && curr.longitude) {
                const distance = this.calculateDistance(
                    prev.latitude, prev.longitude,
                    curr.latitude, curr.longitude
                );
                distances.push(distance);
                totalDistance += distance;

                // Calculate speed if timestamps are available
                if (prev.timestamp && curr.timestamp) {
                    const timeDiff = (new Date(curr.timestamp) - new Date(prev.timestamp)) / 1000; // seconds
                    if (timeDiff > 0) {
                        const speed = distance / timeDiff; // m/s
                        speeds.push(speed);
                    }
                }
            }
        }

        metrics.totalDistance = totalDistance;
        metrics.averageSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
        metrics.maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

        // Calculate accuracy metrics (lower HDOP = better accuracy)
        const hdopValues = measurements.map(m => m.hdop).filter(h => !isNaN(h));
        if (hdopValues.length > 0) {
            const avgHdop = hdopValues.reduce((a, b) => a + b, 0) / hdopValues.length;
            // Rough conversion: HDOP to accuracy in meters (HDOP * 5 is a common approximation)
            metrics.averageAccuracy = avgHdop * 5;
        }

        // Calculate satellite metrics
        const satelliteValues = measurements.map(m => m.satellites).filter(s => !isNaN(s));
        if (satelliteValues.length > 0) {
            metrics.averageSatellites = satelliteValues.reduce((a, b) => a + b, 0) / satelliteValues.length;
        }

        // Calculate tracking duration
        const timestamps = measurements.map(m => m.timestamp).filter(t => t);
        if (timestamps.length > 1) {
            const start = new Date(timestamps[0]);
            const end = new Date(timestamps[timestamps.length - 1]);
            metrics.trackingDuration = (end - start) / (1000 * 60 * 60); // hours
        }

        return metrics;
    }

    /**
     * Calculate distance between two GPS coordinates using Haversine formula
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Calculate traits from GPS measurements and metrics
     */
    calculateTraits(measurements, metrics, sampleId, date) {
        const traits = [];

        if (metrics.averageAccuracy) {
            traits.push({
                method: "create",
                type: "location_accuracy",
                sampleId: sampleId,
                responsible: "",
                date: date,
                measurement: Math.round(metrics.averageAccuracy * 100) / 100,
                unit: "meters",
                equipment: "LoggerMate GPS",
                detail: "Estimated GPS accuracy based on HDOP values",
                notes: "GPS tracking period"
            });
        }

        if (metrics.trackingDuration) {
            traits.push({
                method: "create",
                type: "tracking_duration",
                sampleId: sampleId,
                responsible: "",
                date: date,
                measurement: Math.round(metrics.trackingDuration * 100) / 100,
                unit: "hours",
                equipment: "LoggerMate GPS",
                detail: `GPS tracking duration with ${measurements.length} position fixes`,
                notes: "GPS tracking period"
            });
        }

        if (metrics.totalDistance > 0) {
            traits.push({
                method: "create",
                type: "distance_traveled",
                sampleId: sampleId,
                responsible: "",
                date: date,
                measurement: Math.round(metrics.totalDistance * 100) / 100,
                unit: "meters",
                equipment: "LoggerMate GPS",
                detail: `Total distance with avg speed ${Math.round(metrics.averageSpeed * 100) / 100} m/s`,
                notes: "GPS tracking period"
            });
        }

        if (metrics.averageSatellites) {
            traits.push({
                method: "create",
                type: "average_satellites",
                sampleId: sampleId,
                responsible: "",
                date: date,
                measurement: Math.round(metrics.averageSatellites * 100) / 100,
                unit: "count",
                equipment: "LoggerMate GPS",
                detail: "Average number of GPS satellites used for positioning",
                notes: "GPS tracking period"
            });
        }

        return traits;
    }

    /**
     * Generate experiment name based on file metadata and GPS data
     */
    generateExperimentName(fileMetadata, measurements) {
        const filename = fileMetadata?.filename || 'gps_data';
        const baseName = filename.replace(/\.(txt|csv|TXT|CSV)$/, '');
        
        if (measurements.length > 0) {
            const dateRange = this.getDateRange(measurements);
            if (dateRange.start) {
                return `GPS_${baseName}_${dateRange.start}`;
            }
        }
        
        return `GPS_${baseName}`;
    }

    /**
     * Generate descriptive notes about the GPS tracking
     */
    generateNotes(measurements, metrics) {
        const notes = [`LoggerMate GPS tracking data with ${measurements.length} location points.`];
        
        if (metrics.trackingDuration) {
            notes.push(`Tracking duration: ${Math.round(metrics.trackingDuration * 100) / 100} hours.`);
        }
        
        if (metrics.totalDistance > 0) {
            notes.push(`Total distance: ${Math.round(metrics.totalDistance)} meters.`);
        }
        
        if (metrics.averageSatellites) {
            notes.push(`Average satellites: ${Math.round(metrics.averageSatellites)} satellites.`);
        }
        
        return notes.join(' ');
    }

    /**
     * Get date range from GPS measurements
     */
    getDateRange(measurements) {
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
     * Get bounding box of GPS coordinates
     */
    getBoundingBox(measurements) {
        const lats = measurements.map(m => m.latitude).filter(lat => !isNaN(lat));
        const lons = measurements.map(m => m.longitude).filter(lon => !isNaN(lon));
        
        if (lats.length === 0 || lons.length === 0) {
            return null;
        }
        
        return {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lons),
            west: Math.min(...lons),
            center: {
                latitude: (Math.max(...lats) + Math.min(...lats)) / 2,
                longitude: (Math.max(...lons) + Math.min(...lons)) / 2
            }
        };
    }
}

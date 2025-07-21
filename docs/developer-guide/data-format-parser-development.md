# Data Format Parser Development Guide

Learn how to create custom data format parsers that convert raw instrument data into structured experiment data with automatic trait generation.

## Overview

EvoNEST uses data format parsers to convert raw files from scientific instruments into structured experiment data that can be stored and analyzed. Parsers automatically extract traits and create complete experiment records.

**For file type processing (images, documents, etc.)**, see the [File Processor Development Guide](./file-processor-development.md).

## Current Architecture

```
Raw File → File Processor → Data Format Parser → Structured Experiment Data → API
```

1. **File uploaded** through form interface
2. **File processor** detects format and calls appropriate parser
3. **Data format parser** converts raw data to structured experiment with embedded traits
4. **Experiment API** stores experiment and traits in database
5. **Success notification** confirms trait generation

## Quick Start

1. **Create parser class** in `src/utils/file-management/readable-data-extractors/`
2. **Extend BaseDataFormatParser** with your parsing logic
3. **Register** in `src/utils/file-management/readable-data-extractors/index.js`
4. **Test** with your instrument files

## Creating a Data Format Parser

### 1. Basic Parser Structure

```typescript
import { BaseDataFormatParser, ParsedDataResult } from './BaseDataFormatParser.js';

export class MyInstrumentParser extends BaseDataFormatParser {
    constructor() {
        super();
        this.name = 'MyInstrument';
        this.label = 'My Scientific Instrument';
        this.description = 'Parser for MyInstrument data files';
        this.version = '1.0.0';
        this.supportedFormats = ['.txt', '.csv', '.dat'];
        this.supportedExperimentTypes = ['my_experiment'];
        this.primaryExperimentType = 'my_experiment';
        this.requiredFields = [];
        this.generatedTraits = [
            {
                name: 'temperature',
                unit: '°C',
                description: 'Measured temperature'
            },
            {
                name: 'pressure', 
                unit: 'Pa',
                description: 'Applied pressure'
            }
        ];
    }

    canParse(rawData: string, fileMetadata?: any): boolean {
        // Return true if this parser can handle the data
        return rawData.includes('MY_INSTRUMENT_HEADER') || 
               fileMetadata?.filename?.toLowerCase().includes('myinstrument');
    }

    parse(rawData: string, fileMetadata?: any): ParsedDataResult {
        try {
            // Parse your instrument's specific format
            const lines = rawData.split('\n');
            const dataLines = lines.filter(line => !line.startsWith('#'));
            
            const measurements = dataLines.map(line => {
                const [timestamp, temp, pressure] = line.split(',');
                return {
                    timestamp: new Date(timestamp),
                    temperature: parseFloat(temp),
                    pressure: parseFloat(pressure)
                };
            });

            // Extract traits from data
            const traits = [
                {
                    traitName: 'temperature_avg',
                    value: this.calculateAverage(measurements, 'temperature'),
                    unit: '°C',
                    method: 'calculated',
                    notes: 'Average temperature across all measurements'
                },
                {
                    traitName: 'pressure_max',
                    value: this.calculateMaximum(measurements, 'pressure'),
                    unit: 'Pa',
                    method: 'calculated',
                    notes: 'Maximum pressure recorded'
                }
            ];

            // Return structured experiment data
            return this.createExperimentData({
                name: this.generateExperimentName(fileMetadata),
                type: this.primaryExperimentType,
                traits: traits,
                data: {
                    format: this.name,
                    summary: { 
                        recordCount: measurements.length,
                        dateRange: {
                            start: measurements[0]?.timestamp,
                            end: measurements[measurements.length - 1]?.timestamp
                        }
                    },
                    measurements: measurements
                }
            });

        } catch (error) {
            throw new Error(`Failed to parse ${this.name} data: ${error.message}`);
        }
    }
}
```

### 2. Register Your Parser

Add to `src/utils/file-management/readable-data-extractors/index.js`:

```javascript
import { MyInstrumentParser } from './MyInstrumentParser.js';

// Register in the registry
function registerDefaultParsers() {
    this.register(new MyInstrumentParser());
    // ... other parsers
}

// Export for external use
export { MyInstrumentParser } from './MyInstrumentParser.js';
```

### 3. Parser Metadata Properties

#### Required Properties

```typescript
constructor() {
    super();
    this.name = 'ParserName';                    // Unique parser identifier
    this.label = 'Human Readable Label';        // Displayed in UI
    this.description = 'Parser description';    // Help text
    this.version = '1.0.0';                     // Parser version
    this.supportedFormats = ['.txt', '.csv'];   // File extensions
    this.supportedExperimentTypes = ['type1'];  // Experiment types
    this.primaryExperimentType = 'type1';       // Default type for auto-detection
    this.generatedTraits = [                    // Traits this parser creates
        { name: 'trait_name', unit: 'unit', description: 'desc' }
    ];
}
```

#### Optional Properties

```typescript
this.requiredFields = ['field1', 'field2'];     // Required data fields
this.author = 'Your Name';                      // Parser author
```

## Available Methods

### BaseDataFormatParser Methods

```typescript
// Helper methods for calculations
this.calculateAverage(data, field)              // Average of field values
this.calculateMaximum(data, field)              // Maximum of field values
this.calculateMinimum(data, field)              // Minimum of field values
this.calculateSum(data, field)                  // Sum of field values

// Name generation
this.generateExperimentName(fileMetadata)       // Auto-generate experiment name

// Data structure creation
this.createExperimentData({                     // Create structured experiment data
    name: string,
    type: string,
    traits: TraitData[],
    data: object
})
```

### Data Validation

```typescript
parse(rawData: string, fileMetadata?: any): ParsedDataResult {
    // Basic validation
    if (!rawData || rawData.length === 0) {
        throw new Error('Empty or invalid data');
    }

    // Format-specific validation
    if (!rawData.includes('EXPECTED_HEADER')) {
        throw new Error('Invalid file format - missing expected header');
    }

    // Data quality validation
    const measurements = this.parseData(rawData);
    if (measurements.length < 10) {
        throw new Error('Insufficient data points (minimum 10 required)');
    }

    // Continue with parsing...
}
```

## Integration Flow

### 1. Automatic Discovery

Your parser is automatically discovered when files are uploaded:

```typescript
// File processor calls parser registry
const parsedData = dataFormatParserRegistry.parse(rawText, fileMetadata);

if (parsedData) {
    // Structured data found - experiment created with traits
    const experimentData = {
        type: 'experiment_data',
        dataFields: parsedData
    };
} else {
    // No parser available - treated as document
    const experimentData = {
        type: 'document', 
        dataFields: rawText
    };
}
```

### 2. Experiment Creation

The API automatically handles structured data:

```typescript
// API route processes structured experiment data
if (experimentData.traits) {
    // Create experiment with embedded traits
    const experiment = await createExperiment(experimentData);
    
    // Traits are automatically stored and linked
    await createTraits(experimentData.traits, experiment.id);
}
```

### 3. Frontend Integration

Parsers integrate seamlessly with the form:

- **Auto-detection**: Experiment type automatically suggested based on parser
- **Validation**: Form shows "✓ This experiment type has automatic trait generation"
- **Preview**: Parsed data and trait count displayed before submission

## File Format Examples

### Simple CSV Data

```csv
# MyInstrument Data Export
# Date: 2024-01-01
# Instrument: Model-123
Time,Temperature,Pressure
10:00,23.5,101325
10:01,23.8,101320
10:02,24.1,101315
```

### Complex Format with Metadata

```text
INSTRUMENT_DATA_START
DEVICE_ID: ABC123
SAMPLE_RATE: 1Hz
UNITS: celsius,pascal
DATA_START
timestamp,temperature,pressure
2024-01-01T10:00:00,23.5,101325
2024-01-01T10:01:00,23.8,101320
DATA_END
```

## Best Practices

### 1. Robust Detection

```typescript
canParse(rawData: string, fileMetadata?: any): boolean {
    // Multiple detection criteria
    const hasHeader = rawData.includes('MY_INSTRUMENT_HEADER');
    const hasFilename = fileMetadata?.filename?.includes('myinstrument');
    const hasFormat = rawData.match(/^DEVICE_ID:/m);
    
    return hasHeader || hasFilename || hasFormat;
}
```

### 2. Error Handling

```typescript
parse(rawData: string, fileMetadata?: any): ParsedDataResult {
    try {
        const result = this.parseData(rawData);
        return this.createExperimentData(result);
    } catch (error) {
        // Provide helpful error messages
        if (error.message.includes('parsing')) {
            throw new Error(`Invalid ${this.name} format: ${error.message}`);
        }
        throw new Error(`Failed to process ${this.name} data: ${error.message}`);
    }
}
```

### 3. Data Quality Validation

```typescript
validateMeasurements(measurements) {
    if (measurements.length === 0) {
        throw new Error('No valid measurements found');
    }
    
    // Check for required fields
    const firstMeasurement = measurements[0];
    if (!firstMeasurement.temperature || !firstMeasurement.pressure) {
        throw new Error('Missing required measurement fields');
    }
    
    // Check data quality
    const validCount = measurements.filter(m => 
        !isNaN(m.temperature) && !isNaN(m.pressure)
    ).length;
    
    if (validCount < measurements.length * 0.9) {
        throw new Error('Too many invalid measurements (>10% invalid)');
    }
}
```

## Available Parsers

### Data Format Parsers (Text/Data Files)
- **LoggerMateFormatParser**: Wireless datalogger files with metadata sections
- **CSVFormatParser**: Generic CSV/TSV files with configurable delimiters
- **TensileTestFormatParser**: Mechanical testing data files

### File Processors (Extension-Based)
- **Image Processor**: JPEG, PNG, GIF, BMP, WebP, SVG files - creates thumbnails
- **TIFF Processor**: TIFF image files with specialized scientific imaging support
- **Document Processor**: PDF, DOC, TXT document files for protocols and documentation
- **Lossless Image Processor**: Raw and lossless image formats preserving quality

**Note**: File processors handle specific file extensions and create basic file records, while data format parsers convert instrument data into structured experiments with traits. Choose data format parsers for scientific instruments, file processors for general file handling.

## Testing

Test your parser with real instrument files:

```typescript
import { dataFormatParserRegistry } from './index.js';

// Test parsing
const rawData = `MY_INSTRUMENT_HEADER
timestamp,temperature,pressure
2024-01-01T10:00:00,23.5,101325`;

const result = dataFormatParserRegistry.parse(rawData, { filename: 'test.txt' });

if (result) {
    console.log('Parser detected:', result.format);
    console.log('Traits generated:', result.experimentData.traits.length);
    console.log('Data records:', result.data.measurements.length);
}
```

---

For complete examples, see existing parsers in `src/utils/file-management/readable-data-extractors/`.

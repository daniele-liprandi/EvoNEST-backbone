# Data Format Parsers

Convert raw instrument data into structured experiment data with automatic trait generation.

## Purpose

Data format parsers transform raw text files from scientific instruments into structured experiment data that EvoNEST can store and analyze. Each parser handles specific instrument formats and automatically generates relevant biological traits.

## Quick Implementation

### 1. Create Parser Class

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
        this.supportedExperimentTypes = ['my_experiment_type'];
        this.primaryExperimentType = 'my_experiment_type';
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
        return rawData.includes('MY_INSTRUMENT_HEADER') || 
               fileMetadata?.filename?.includes('myinstrument');
    }

    parse(rawData: string, fileMetadata?: any): ParsedDataResult {
        try {
            // Parse your instrument's format
            const lines = rawData.split('\n');
            const dataLines = lines.filter(line => !line.startsWith('#'));
            
            const parsedData = dataLines.map(line => {
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
                    traitName: 'temperature',
                    value: this.calculateAverage(parsedData, 'temperature'),
                    unit: '°C'
                },
                {
                    traitName: 'pressure',
                    value: this.calculateAverage(parsedData, 'pressure'),
                    unit: 'Pa'
                }
            ];

            // Return structured experiment data
            return this.createExperimentData({
                name: this.generateExperimentName(fileMetadata),
                type: this.primaryExperimentType,
                traits: traits,
                data: {
                    format: this.name,
                    summary: { recordCount: parsedData.length },
                    measurements: parsedData
                }
            });

        } catch (error) {
            throw new Error(`Failed to parse ${this.name} data: ${error.message}`);
        }
    }
}
```

### 2. Register Parser

Add to `index.js`:

```javascript
import { MyInstrumentParser } from './MyInstrumentParser.js';

// In registerDefaultParsers()
this.register(new MyInstrumentParser());
```

### 3. Export Parser

Add to `index.js` exports:

```javascript
export { MyInstrumentParser } from './MyInstrumentParser.js';
```

## Available Parsers

- **LoggerMateFormatParser**: Wireless datalogger files with metadata sections
- **CSVFormatParser**: Generic CSV/TSV with customizable delimiters  
- **TensileTestFormatParser**: Mechanical testing data files

## Parser Requirements

### Essential Methods

- `canParse(rawData, fileMetadata)`: Return `true` if parser can handle the data
- `parse(rawData, fileMetadata)`: Return structured experiment data with traits

### Metadata Properties

- `supportedExperimentTypes`: Array of experiment types this parser handles
- `primaryExperimentType`: Default experiment type for auto-detection
- `generatedTraits`: Array describing traits this parser extracts
- `supportedFormats`: File extensions this parser supports

### Data Structure

Use `this.createExperimentData()` to ensure proper structure:

```typescript
return this.createExperimentData({
    name: string,           // Experiment name
    type: string,           // Experiment type
    traits: TraitData[],    // Extracted traits
    data: object           // Raw measurements
});
```

## Best Practices

1. **Robust Detection**: Use multiple criteria in `canParse()`
2. **Error Handling**: Wrap parsing logic in try-catch
3. **Validation**: Validate data before creating traits
4. **Documentation**: Document expected file format
5. **Testing**: Test with real instrument files

## Trait Generation

Traits are automatically stored when experiments are created:

```typescript
const traits = [
    {
        traitName: 'temperature_avg',
        value: 23.5,
        unit: '°C',
        method: 'calculated',
        notes: 'Average temperature across all measurements'
    }
];
```

## Integration

Parsers integrate automatically with the experiment creation pipeline:
1. File uploaded → File processor detects format
2. Parser converts to structured data → Traits extracted
3. Experiment created → Traits stored in database

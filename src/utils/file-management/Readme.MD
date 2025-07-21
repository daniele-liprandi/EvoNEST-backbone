# EvoNEST File Processing System

EvoNEST processes experiment files through a three-layer architecture:

```
Raw File → File Processor → Data Format Parser → Structured Data → API
```

## Processing Layers

### 1. File Processors (`processors/`)
Handle file upload, type detection, and basic processing by file extension.

### 2. Data Format Parsers (`readable-data-extractors/`)
Convert raw text data into structured formats with automatic experiment type detection.

### 3. API Integration
Structured data flows directly to experiment creation with embedded traits.

## Quick Start

### For New Instrument Data Formats
Create a data format parser in `readable-data-extractors/`:

```typescript
export class MyInstrumentParser extends BaseDataFormatParser {
    constructor() {
        super();
        this.name = 'MyInstrument';
        this.supportedExperimentTypes = ['my_experiment'];
        this.primaryExperimentType = 'my_experiment';
        this.generatedTraits = [
            { name: 'temperature', unit: '°C', description: 'Measured temperature' }
        ];
    }

    canParse(rawData: string): boolean {
        return rawData.includes('MY_INSTRUMENT_HEADER');
    }

    parse(rawData: string): ParsedDataResult {
        // Parse and return structured experiment data
        return this.createExperimentData({
            name: 'Auto-generated name',
            type: 'my_experiment',
            traits: [/* extracted traits */],
            data: {/* structured data */}
        });
    }
}
```

### For New File Types
Create a file processor in `processors/`:

```typescript
export async function processMyFileType(params: FileProcessorParams): Promise<void> {
    // Handle specific file format processing
}

export const myFileTypeMetadata = {
    name: 'MyFileProcessor',
    supportedExperimentTypes: ['my_type'],
    supportedFormats: ['.myext'],
    // ... metadata
};
```

## Registration

Both parsers and processors are automatically registered through their respective index files. Add your new parser/processor to the appropriate index.ts file. 
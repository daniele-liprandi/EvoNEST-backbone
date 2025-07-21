# File Processors

Handle file upload, type detection, and basic processing by file extension.

## Purpose

File processors manage specific file types during upload and determine processing strategy. Unlike data format parsers, processors handle file-level operations such as image processing, document handling, and binary file management.

## Quick Implementation

### 1. Create Processor Function

```typescript
import { FileProcessorParams } from './types';

export async function processMyFileType(params: FileProcessorParams): Promise<void> {
    const { file, form, setFormState, setAllFileData, defaultValues } = params;
    
    // Process file content
    const processedData = await processFile(file);
    
    // Update form with processed data
    const updatedValues = {
        ...defaultValues,
        filename: file.name,
        type: 'my_file_type',
        dataFields: processedData
    };
    
    // Update application state
    updateFormValues(form, setFormState, setAllFileData, updatedValues);
}
```

### 2. Define Processor Metadata

```typescript
export const myFileTypeMetadata = {
    name: 'MyFileProcessor',
    label: 'My File Type Processor',
    description: 'Processes my custom file format',
    version: '1.0.0',
    supportedFormats: ['.myext', '.custom'],
    supportedExperimentTypes: ['my_experiment'],
    primaryExperimentType: 'my_experiment',
    requiredFields: [],
    generatedTraits: [
        {
            name: 'file_size',
            unit: 'bytes',
            description: 'File size in bytes'
        }
    ]
};
```

### 3. Register Processor

Add to `index.ts`:

```typescript
// Export processor
export { processMyFileType, myFileTypeMetadata } from './my-file-processor';

// Register in fileProcessorRegistry
fileProcessorRegistry.register(myFileTypeMetadata, processMyFileType);
```

## Available Processors

- **Image Processor**: JPEG, PNG, GIF, WebP image files
- **TIFF Processor**: TIFF image files with metadata extraction
- **Document Processor**: PDF, DOC, TXT document files
- **Lossless Image Processor**: Raw and lossless image formats

## Processor Interface

```typescript
export interface FileProcessorParams {
    file: File;
    defaultValues: ExperimentFormValues;
    samples: any[];
    existingNames: string[];
    form: any;
    setFormState: React.Dispatch<React.SetStateAction<ExperimentFormValues>>;
    setAllFileData: React.Dispatch<React.SetStateAction<Array<Partial<ExperimentFormValues>>>>;
}

export type FileProcessor = (params: FileProcessorParams) => Promise<void>;
```

## Processing Strategies

### Binary Files (Images, Documents)
```typescript
export async function processBinaryFile(params: FileProcessorParams): Promise<void> {
    const { file } = params;
    
    // Read as binary
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract metadata
    const metadata = extractMetadata(arrayBuffer);
    
    // Process and store
    const processedData = {
        type: 'binary',
        size: file.size,
        metadata: metadata
    };
    
    // Update form...
}
```

### Text Files (Data, Logs)
```typescript
export async function processTextFile(params: FileProcessorParams): Promise<void> {
    const { file } = params;
    
    // Read as text
    const text = await file.text();
    
    // Try data format parsers
    const parsedData = dataFormatParserRegistry.parse(text, { filename: file.name });
    
    if (parsedData) {
        // Structured data found
        const processedData = {
            type: 'experiment_data',
            dataFields: parsedData
        };
    } else {
        // Plain text
        const processedData = {
            type: 'document',
            dataFields: text
        };
    }
    
    // Update form...
}
```

## Registry Integration

The processor registry automatically manages discovery:

```typescript
// Processors are registered at startup
fileProcessorRegistry.register(imageMetadata, processImageFile);
fileProcessorRegistry.register(documentMetadata, processDocumentFile);

// Discovery is automatic
const supportedTypes = fileProcessorRegistry.getSupportedExperimentTypes();
```

## Best Practices

1. **File Type Detection**: Use file extension and content inspection
2. **Error Handling**: Gracefully handle corrupted or invalid files
3. **Memory Management**: Stream large files when possible
4. **Metadata Extraction**: Extract relevant file metadata
5. **Form Integration**: Use provided utility functions for state updates

## Shared Utilities

Available utility functions:

```typescript
import { 
    generateUniqueName,
    getSuggestedExperimentType,
    updateFormValues,
    resetGeneratedNames 
} from './utils';

// Generate unique experiment name
const uniqueName = generateUniqueName(baseName, existingNames);

// Get suggested experiment type based on data
const suggestedType = getSuggestedExperimentType(parsedData);

// Update form state consistently
updateFormValues(form, setFormState, setAllFileData, updatedValues);
```

## Integration Points

Processors integrate with:
- **File Upload**: Triggered automatically by file extension
- **Data Format Parsers**: Text processors use parser registry for structured data
- **Experiment Creation**: Processed data flows to experiment API
- **Form Management**: Updates form state and validation

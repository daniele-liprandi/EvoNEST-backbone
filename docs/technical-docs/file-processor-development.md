# File Processor Development Guide

Learn how to create custom file processors that handle specific file types and extensions in EvoNEST.

## Overview

File processors handle file-level operations such as image processing, document handling, and binary file management. Unlike data format parsers, they focus on file type detection and basic processing rather than extracting scientific traits.

## Current architecture

```
Raw File → File Type Detection → File Processor → Processed File Data → Form Update
```

1. **File uploaded** through form interface
2. **Extension detection** determines file type
3. **File processor** handles type-specific processing (thumbnails, metadata, etc.)
4. **Form state updated** with processed file information
5. **User sees preview** of processed file

## When to create file processors

Create file processors when you need to:
- Handle specific file extensions not covered by existing processors
- Extract metadata from binary file formats
- Create previews or thumbnails
- Perform file-specific validation or processing
- Support new image/document formats

**Note**: For scientific instrument data that needs trait extraction, create a [data format parser](./data-format-parser-development.md) instead.

## Quick start

1. **Create processor function** in `src/utils/file-management/processors/`
2. **Define processor metadata** with supported formats and experiment types
3. **Register** in `src/utils/file-management/processors/index.ts`
4. **Test** with your file types

## Creating a file processor

### 1. Basic processor structure

```typescript
import { FileProcessorParams } from './types';
import { updateFormValues } from './utils';

// Processor metadata for experiment type discovery
export const myFileTypeMetadata = {
    name: 'MyFileTypeProcessor',
    label: 'My File Type Processor',
    description: 'Processes my custom file format with specialized handling',
    version: '1.0.0',
    author: 'Your Name',
    supportedFormats: ['.myext', '.custom'],
    supportedExperimentTypes: ['my_file_experiment'],
    primaryExperimentType: 'my_file_experiment',
    requiredFields: [],
    generatedTraits: [] // File processors typically don't generate traits
};

export async function processMyFileType(params: FileProcessorParams): Promise<void> {
    const { file, defaultValues, form, setFormState, setAllFileData } = params;

    try {
        // Read file content based on type
        const fileContent = await readFileContent(file);
        
        // Extract metadata
        const metadata = await extractMetadata(file, fileContent);
        
        // Process file (resize, convert, validate, etc.)
        const processedData = await processFile(file, fileContent);
        
        // Create updated values
        const updatedValues = {
            ...defaultValues,
            filename: file.name,
            type: 'my_file_experiment',
            date: new Date(file.lastModified),
            name: `my_file_${file.name}`,
            metadata: [
                { key: 'originalName', value: file.name },
                { key: 'fileSize', value: file.size.toString() },
                { key: 'lastModified', value: file.lastModified.toString() },
                ...metadata
            ],
            dataFields: processedData
        };

        // Update form state
        updateFormValues(form, updatedValues, setFormState, setAllFileData);

    } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        throw new Error(`Failed to process ${file.name}: ${error.message}`);
    }
}

// Helper functions
async function readFileContent(file: File): Promise<ArrayBuffer | string> {
    // Read as binary for most file types
    return await file.arrayBuffer();
    
    // Or read as text for text-based formats
    // return await file.text();
}

async function extractMetadata(file: File, content: ArrayBuffer | string): Promise<Array<{key: string, value: string}>> {
    const metadata = [];
    
    // Extract file-specific metadata
    // Example: EXIF data from images, document properties, etc.
    
    return metadata;
}

async function processFile(file: File, content: ArrayBuffer | string): Promise<any> {
    // Perform file-specific processing
    // Example: create thumbnails, convert formats, validate structure
    
    return content; // or processed version
}
```

### 2. Image processor example

```typescript
export async function processImageFile(params: FileProcessorParams): Promise<void> {
    const { file, defaultValues, form, setFormState, setAllFileData } = params;

    return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function () {
            const img = new Image();
            img.onload = function () {
                // Create thumbnail
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = 200;
                const aspectRatio = img.width / img.height;
                canvas.height = Math.round(canvas.width / aspectRatio);

                ctx!.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const updatedValues = { ...defaultValues };
                        updatedValues.filename = file.name;
                        updatedValues.type = 'image';
                        updatedValues.date = new Date(file.lastModified);
                        updatedValues.name = `image_${file.name}`;
                        
                        // Store image metadata
                        updatedValues.metadata = [
                            { key: 'name', value: file.name },
                            { key: 'type', value: file.type },
                            { key: 'size', value: file.size.toString() },
                            { key: 'lastModified', value: file.lastModified.toString() },
                        ];

                        if (img.width && img.height) {
                            updatedValues.metadata.push(
                                { key: 'originalWidth', value: img.width.toString() },
                                { key: 'originalHeight', value: img.height.toString() }
                            );
                        }

                        // Store thumbnail as dataFields
                        updatedValues.dataFields = blob;

                        updateFormValues(form, updatedValues, setFormState, setAllFileData);
                        resolve();
                    } else {
                        reject(new Error('Failed to create thumbnail'));
                    }
                }, 'image/jpeg', 0.85);
            };
            img.onerror = reject;
            img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
```

### 3. Document processor example

```typescript
export async function processDocumentFile(params: FileProcessorParams): Promise<void> {
    const { file, defaultValues, existingNames, form, setFormState, setAllFileData } = params;

    const updatedValues = { ...defaultValues };
    updatedValues.filename = file.name;
    updatedValues.type = 'document';
    updatedValues.date = new Date(file.lastModified);
    updatedValues.name = generateUniqueName(`document_${file.name}`, existingNames);

    // For documents, we typically just store file reference
    // Advanced processors might extract text content, metadata, etc.
    
    updateFormValues(form, updatedValues, setFormState, setAllFileData);
}
```

### 4. Register your processor

Add to `src/utils/file-management/processors/index.ts`:

```typescript
// Import your processor
import { processMyFileType, myFileTypeMetadata } from './my-file-processor';

// Export for external use
export { processMyFileType, myFileTypeMetadata } from './my-file-processor';

// Register in the processor registry
fileProcessorRegistry.register(myFileTypeMetadata, processMyFileType);
```

## Processor interface

### FileProcessorParams

```typescript
export interface FileProcessorParams {
    file: File;                                    // The uploaded file
    defaultValues: ExperimentFormValues;          // Default form values
    samples: any[];                               // Available samples
    existingNames: string[];                      // Existing experiment names
    form: any;                                    // React Hook Form instance
    setFormState: React.Dispatch<React.SetStateAction<ExperimentFormValues>>;
    setAllFileData: React.Dispatch<React.SetStateAction<Array<Partial<ExperimentFormValues>>>>;
}

export type FileProcessor = (params: FileProcessorParams) => Promise<void>;
```

### Processor metadata

```typescript
export interface ProcessorMetadata {
    name: string;                                 // Unique processor identifier
    label: string;                               // Human-readable label for UI
    description: string;                         // Processor description
    version: string;                             // Processor version
    author?: string;                             // Author name
    supportedFormats: string[];                  // File extensions (e.g., ['.jpg', '.png'])
    supportedExperimentTypes: string[];          // Experiment types this processor handles
    primaryExperimentType: string;               // Default experiment type
    requiredFields: string[];                    // Required form fields
    generatedTraits: Array<{                     // Traits generated (usually empty for processors)
        name: string;
        unit: string;
        description: string;
    }>;
}
```

## File reading strategies

### Binary files (images, documents)

```typescript
async function processBinaryFile(file: File): Promise<ArrayBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    
    // Process binary data
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Extract headers, metadata, etc.
    const header = uint8Array.slice(0, 10);
    
    return arrayBuffer;
}
```

### Text files

```typescript
async function processTextFile(file: File): Promise<string> {
    const text = await file.text();
    
    // Check if it's structured data that should use a parser
    const parsedData = dataFormatParserRegistry.parse(text, { filename: file.name });
    
    if (parsedData) {
        // Structured data found - delegate to data format parser
        throw new Error('This file contains structured data and should be processed by a data format parser');
    }
    
    // Process as plain text
    return text;
}
```

### Stream processing (large files)

```typescript
async function processLargeFile(file: File): Promise<void> {
    const stream = file.stream();
    const reader = stream.getReader();
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Process chunk
            processChunk(value);
        }
    } finally {
        reader.releaseLock();
    }
}
```

## Available utility functions

### From `utils.ts`

```typescript
import { 
    generateUniqueName,           // Create unique experiment names
    getSuggestedExperimentType,   // Get suggested type based on data
    updateFormValues,             // Update form state consistently
    resetGeneratedNames           // Reset name generator for new batch
} from './utils';

// Generate unique experiment name
const uniqueName = generateUniqueName(`${fileType}_${file.name}`, existingNames);

// Update form state
updateFormValues(form, updatedValues, setFormState, setAllFileData);
```

## Integration with file upload

### Automatic processor selection

File processors are automatically selected based on file extension:

```typescript
// In extension-processors.tsx
const fileExtension = path.extname(file.name).toLowerCase();

switch (fileExtension) {
    case '.jpg':
    case '.jpeg':
    case '.png':
    case '.gif':
    case '.bmp':
    case '.webp':
    case '.svg':
        await processImageFile(params);
        break;
    case '.tiff':
    case '.tif':
        await processTiffFile(params);
        break;
    case '.myext':
        await processMyFileType(params);
        break;
    default:
        // Try data format parsers for text files
        await processPlainTextFile(params);
}
```

### Registry integration

The processor registry enables automatic discovery:

```typescript
// Processors are automatically registered
fileProcessorRegistry.register(myFileTypeMetadata, processMyFileType);

// Discovery is automatic
const supportedTypes = fileProcessorRegistry.getSupportedExperimentTypes();
const processorInfo = fileProcessorRegistry.getMetadata('MyFileTypeProcessor');
```

## Error handling

### File validation

```typescript
async function validateFile(file: File): Promise<void> {
    // Check file size
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File too large (maximum 10MB)');
    }
    
    // Check file type
    const allowedTypes = ['.jpg', '.png', '.pdf'];
    const extension = path.extname(file.name).toLowerCase();
    if (!allowedTypes.includes(extension)) {
        throw new Error(`Unsupported file type: ${extension}`);
    }
    
    // Check file content
    const header = await file.slice(0, 10).arrayBuffer();
    if (!isValidFileHeader(header)) {
        throw new Error('Invalid file format');
    }
}
```

### Processing errors

```typescript
export async function processMyFileType(params: FileProcessorParams): Promise<void> {
    const { file } = params;
    
    try {
        // Validate file first
        await validateFile(file);
        
        // Process file
        const result = await processFile(file);
        
        // Update form
        updateFormValues(form, result, setFormState, setAllFileData);
        
    } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        
        // Provide user-friendly error messages
        if (error.message.includes('too large')) {
            throw new Error(`File "${file.name}" is too large. Please use a smaller file.`);
        } else if (error.message.includes('unsupported')) {
            throw new Error(`File type not supported for "${file.name}". Please use a different format.`);
        } else {
            throw new Error(`Failed to process "${file.name}": ${error.message}`);
        }
    }
}
```

## Best practices

### 1. memory management

```typescript
// For large files, process in chunks
async function processLargeImage(file: File): Promise<Blob> {
    // Use canvas for image processing to avoid memory issues
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set reasonable canvas size limits
    const maxWidth = 2048;
    const maxHeight = 2048;
    
    // Process image...
    
    return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
}
```

### 2. file type detection

```typescript
function detectFileType(file: File): string {
    // Use multiple detection methods
    const extension = path.extname(file.name).toLowerCase();
    const mimeType = file.type;
    
    // Validate consistency
    if (extension === '.jpg' && !mimeType.includes('image/jpeg')) {
        console.warn('File extension and MIME type mismatch');
    }
    
    return extension;
}
```

### 3. progressive processing

```typescript
async function processFileWithProgress(file: File, onProgress?: (progress: number) => void): Promise<any> {
    const totalSteps = 5;
    let currentStep = 0;
    
    // Step 1: Validate
    onProgress?.(++currentStep / totalSteps);
    await validateFile(file);
    
    // Step 2: Read
    onProgress?.(++currentStep / totalSteps);
    const content = await file.arrayBuffer();
    
    // Step 3: Process
    onProgress?.(++currentStep / totalSteps);
    const processed = await processContent(content);
    
    // Continue...
    
    return processed;
}
```

## Available file processors

- **Image Processor**: JPEG, PNG, GIF, BMP, WebP, SVG - creates thumbnails and extracts dimensions
- **TIFF Processor**: TIFF files with specialized scientific imaging support
- **Document Processor**: PDF, DOC, TXT - handles document files for protocols
- **Lossless Image Processor**: RAW and lossless formats preserving quality

## Testing your processor

```typescript
// Test file processing
const mockFile = new File(['test content'], 'test.myext', { type: 'application/octet-stream' });
const mockParams = {
    file: mockFile,
    defaultValues: {},
    samples: [],
    existingNames: [],
    form: mockForm,
    setFormState: jest.fn(),
    setAllFileData: jest.fn()
};

await processMyFileType(mockParams);

// Verify results
expect(mockParams.setFormState).toHaveBeenCalledWith(
    expect.objectContaining({
        filename: 'test.myext',
        type: 'my_file_experiment'
    })
);
```

---

For data format parsers that extract scientific traits, see the [Data Format Parser Development Guide](./experiment-parser-development.md).

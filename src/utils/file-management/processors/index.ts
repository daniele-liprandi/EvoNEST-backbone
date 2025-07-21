export { type FileProcessor, type FileProcessorParams } from './types';
export { processPlainTextFile } from './readable-processor';
export { processImageFile, imageProcessorMetadata } from './image-processor';
export { processTiffFile, tiffProcessorMetadata } from './tiff-processor';
export { processLosslessImageFile, losslessImageProcessorMetadata } from './lossless-image-processor';
export { processDocumentFile, documentProcessorMetadata } from './document-processor';
export { 
    generateUniqueName, 
    getSuggestedExperimentType, 
    updateFormValues, 
    resetGeneratedNames 
} from './utils';

// Import everything for the registry
import { processImageFile, imageProcessorMetadata } from './image-processor';
import { processTiffFile, tiffProcessorMetadata } from './tiff-processor';
import { processLosslessImageFile, losslessImageProcessorMetadata } from './lossless-image-processor';
import { processDocumentFile, documentProcessorMetadata } from './document-processor';

// File Processor Registry
class FileProcessorRegistry {
    private processors = new Map<string, { metadata: any; processor: Function }>();

    register(metadata: any, processor: Function) {
        this.processors.set(metadata.name, { metadata, processor });
    }

    getAll() {
        return Array.from(this.processors.values()).map(({ metadata }) => metadata);
    }

    getProcessor(name: string) {
        const entry = this.processors.get(name);
        return entry ? entry.processor : null;
    }

    getMetadata(name: string) {
        const entry = this.processors.get(name);
        return entry ? entry.metadata : null;
    }

    getSupportedExperimentTypes() {
        const types: Array<{value: string, label: string, processor: string}> = [];
        
        this.processors.forEach(({ metadata }) => {
            metadata.supportedExperimentTypes.forEach((experimentType: string) => {
                types.push({
                    value: experimentType,
                    label: metadata.label,
                    processor: metadata.name
                });
            });
        });
        
        return types;
    }
}

// Create and populate the registry
export const fileProcessorRegistry = new FileProcessorRegistry();

// Register all processors with their metadata
fileProcessorRegistry.register(imageProcessorMetadata, processImageFile);
fileProcessorRegistry.register(tiffProcessorMetadata, processTiffFile);
fileProcessorRegistry.register(losslessImageProcessorMetadata, processLosslessImageFile);
fileProcessorRegistry.register(documentProcessorMetadata, processDocumentFile);

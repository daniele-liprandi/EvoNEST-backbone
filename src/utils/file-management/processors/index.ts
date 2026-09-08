export { type FileProcessor, type FileProcessorParams, UnrecognisedDataFileError } from './types';
export { processPlainTextFile } from './readable-processor';
export {
    generateUniqueName,
    getSuggestedExperimentType,
    updateFormValues,
    resetGeneratedNames
} from './utils';

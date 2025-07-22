/**
 * Experiment Type Discovery Utility
 * 
 * Discovers available experiment types by examining the processors and readable-data-extractors
 * This replaces the old useExperimentParsers hook since parsers are now frontend-only
 */

import { dataFormatParserRegistry } from './readable-data-extractors/index';
import { fileProcessorRegistry } from './processors/index';

// Get processor-supported experiment types from registry
function getProcessorSupportedTypes(): Array<{value: string, label: string, processor: string}> {
    return fileProcessorRegistry.getSupportedExperimentTypes();
}

// Get parser-supported experiment types dynamically from parser metadata
export function getSupportedTypes(): Array<{value: string, label: string, parser: string}> {
  const parsers = dataFormatParserRegistry.getAll();
  const processorTypes = getProcessorSupportedTypes();
  const types: Array<{value: string, label: string, parser: string}> = [];
  
  // Add parser types
  parsers.forEach((parser: any) => {
    try {
      // Check if parser has the new metadata structure
      if (parser.supportedExperimentTypes && parser.primaryExperimentType) {
        // Use parser's own metadata
        parser.supportedExperimentTypes.forEach((experimentType: string) => {
          types.push({
            value: experimentType,
            label: parser.label || parser.name,
            parser: parser.name
          });
        });

      } else {
        // Fallback for older parsers without metadata
        types.push({
          value: parser.name,
          label: parser.label || parser.name,
          parser: parser.name
        });
      }
      
    } catch (error) {
      console.warn(`Could not get info from parser ${parser.name}:`, error);
    }
  });
  
  // Add processor types (convert processor format to parser format)
  processorTypes.forEach(processorType => {
    types.push({
      value: processorType.value,
      label: processorType.label,
      parser: processorType.processor // processor name becomes parser name
    });
  });
  
  return types;
}

/**
 * Get all available experiment types
 */
export function getAvailableExperimentTypes(): Array<{value: string, label: string}> {
  const processorTypes = getProcessorSupportedTypes();
  const parserTypes = getSupportedTypes();
  
  // Combine and deduplicate
  const allTypes = [
    ...processorTypes.map(({ value, label }) => ({ value, label })),
    ...parserTypes.map(({ value, label }) => ({ value, label }))
  ];
  
  // Remove duplicates by value
  const uniqueTypes = allTypes.filter((type, index, self) => 
    index === self.findIndex(t => t.value === type.value)
  );
  
  return uniqueTypes;
}

/**
 * Check if an experiment type has parser support (structured data)
 */
export function checkParserSupport(experimentType: string): boolean {
  const parserTypes = getSupportedTypes();
  return parserTypes.some(type => type.value === experimentType);
}

/**
 * Get parser/processor information for an experiment type
 */
export function getParserInfo(experimentType: string): {
  requiresStructuredData: boolean;
  type: string;
  label: string;
  description: string;
  supportedTypes: string[];
  requiredFields: string[];
  generatedTraits: Array<{name: string, unit: string, description: string}>;
  version: string;
  parser?: string;
} {
  // First check parsers (structured data)
  const parserTypes = getSupportedTypes();
  const parserType = parserTypes.find(type => type.value === experimentType);
  
  if (parserType) {
    const parsers = dataFormatParserRegistry.getAll();
    const parser = parsers.find((p: any) => p.name === parserType.parser);
    
    if (parser) {
      return {
        requiresStructuredData: parser.requiresStructuredData || false,
        type: experimentType,
        parser: parserType.parser,
        label: parser.label || parserType.label,
        description: parser.description || 'No description available',
        supportedTypes: parser.supportedExperimentTypes || [experimentType],
        requiredFields: parser.requiredFields || [],
        generatedTraits: parser.generatedTraits || [],
        version: parser.version || '1.0.0'
      };
    }
  }
  
  // Then check processors (file processing)
  const processorTypes = getProcessorSupportedTypes();
  const processorType = processorTypes.find(type => type.value === experimentType);
  
  if (processorType) {
    const processorMetadata = fileProcessorRegistry.getMetadata(processorType.processor);
    
    if (processorMetadata) {
      return {
        requiresStructuredData: processorMetadata.requiresStructuredData || false,
        type: experimentType,
        parser: processorMetadata.name,
        label: processorMetadata.label,
        description: processorMetadata.description,
        supportedTypes: processorMetadata.supportedExperimentTypes,
        requiredFields: processorMetadata.requiredFields,
        generatedTraits: processorMetadata.generatedTraits,
        version: processorMetadata.version,
      };
    }
  }
  
  // Return default values for unsupported types
  return {
    requiresStructuredData: false,
    type: experimentType,
    label: 'Unknown Type',
    description: 'No parser or processor available for this experiment type',
    supportedTypes: [],
    requiredFields: [],
    generatedTraits: [],
    version: '1.0.0'
  };
}

/**
 * Validate experiment type and data compatibility
 */
export function validateExperimentType(type: string, fileData: any): {
  valid: boolean;
  message?: string;
} {
  const parserInfo = getParserInfo(type);
  
  if (!parserInfo.requiresStructuredData) {
    // For non-parser types (image, document), validation always passes
    return { valid: true };
  }
  
  // For parser-supported types, be more lenient with validation
  // Allow files that have been processed by parsers, even if structure differs
  if (fileData?.dataFields) {
    // If we have any dataFields, consider it valid
    // The parsers should have already validated the data structure
    return { valid: true };
  }
  
  // Only fail if there's absolutely no processed data for a parser-supported type
  return {
    valid: false,
    message: `${parserInfo.label} requires structured data, but file was not parsed correctly`
  };
}

/**
 * Get experiment types that support automatic trait generation
 */
export function getTraitGeneratingTypes(): string[] {
  return getSupportedTypes().map(type => type.value);
}

/**
 * Get unique parser options for form dropdowns
 */
export function getUniqueParserOptions(): Array<{value: string, label: string}> {
  const parserTypes = getSupportedTypes();
  
  // Return unique options (in case of duplicates)
  const uniqueMap = new Map<string, string>();
  parserTypes.forEach(type => {
    uniqueMap.set(type.value, type.label);
  });
  
  return Array.from(uniqueMap.entries()).map(([value, label]) => ({
    value,
    label
  }));
}

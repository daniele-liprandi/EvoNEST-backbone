/**
 * Standardized interfaces for data format parsers
 */

/**
 * Summary statistics about the parsed data
 */
export interface DataSummary {
  recordCount: number;
  columns?: string[];
  dataRange?: {
    start?: string | number;
    end?: string | number;
  };
  [key: string]: any;
}

/**
 * Traits extracted from parsed data. Should come as an array of objects ready to follow the structure indicated in api/traits
 * {
    "method": "create",
    "type": "silk_diameter",
    "sampleId": "507f1f77bcf86cd799439012",
    "responsible": "507f1f77bcf86cd799439013",
    "date": "2024-03-15",
    "measurement": 2.5,
    "unit": "μm",
    "equipment": "SEM",
    "nfibres": "1",
    "detail": "major ampullate silk",
    "notes": "Good quality sample"
} 
*/

/**
 * Individual trait data structure
 */
export interface TraitAPIData {
  method: "create";
  type: string;
  sampleId: string;
  responsible: string;
  date: string;
  measurement: number;
  unit: string;
  equipment?: string;
  nfibres?: string;
  detail?: string;
  notes?: string;
  [key: string]: any;
}

/**
 * Experiment extracted from parsed data. Should come as an array of objects ready to follow the structure indicated in api/experiments
 * experimentData = {
    name: data.name,
    sampleId: data.sampleId,
    responsible: data.responsible,
    type: data.type,
    date: data.date,
    notes: data.notes,
    filename: data.filename,
    filepath: data.filepath,
    fileId: data.fileId,
    version: 1,
    conversionHistory: [],
    recentChangeDate: new Date().toISOString(),
    logbook: [[`${new Date().toISOString()}`, `Uploaded experiment ${data.name}`]],
    window: data.window,
};

 */

/**
 * Individual experiment data structure
 */
export interface ExperimentAPIData {
  name: string;
  sampleId: string;
  responsible: string;
  type: string;
  date: string;
  notes?: string;
  data?: any; // Processed data content
  traits?: TraitAPIData[]; // Extracted traits
  [key: string]: any;
}

export interface ExperimentsAPIData extends Array<ExperimentAPIData> {}

/**
 * Standardized structure that all data format parsers must return
 */
export interface ParsedDataResult {
  // Core parsing info
  format: string;
  suggestedExperimentType: string;

  // Data that goes directly into the experiment document
  experimentData: ExperimentAPIData;

  // Parsing metadata
  parsingMetadata?: {
    confidence: number;
    autoDetectedReason?: string;
    alternativeTypes?: string[];
    parsedAt: string;
  };
}

/**
 * Type guard to check if parsed data follows the standard structure
 */
export function isParsedDataResult(data: any): data is ParsedDataResult {
  return (
    data &&
    typeof data === "object" &&
    data.experimentData !== undefined
  );
}

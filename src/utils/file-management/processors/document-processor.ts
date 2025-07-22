import { ExperimentFormValues } from "../extension-processors";
import { FileProcessorParams } from "./types";
import { generateUniqueName, updateFormValues } from "./utils";

// Processor metadata for experiment type discovery
export const documentProcessorMetadata = {
  name: "DocumentProcessor",
  label: "Document Processor",
  supportedFormats: [".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt"],
  version: "1.0.0",
  description:
    "Processes document files for experimental documentation and protocols",
  author: "Daniele Liprandi",
  supportedExperimentTypes: ["document"],
  primaryExperimentType: "document",
  requiresStructuredData: false,
  requiredFields: [],
  generatedTraits: [], // No traits are actually generated - only basic file processing
};

export async function processDocumentFile(params: FileProcessorParams): Promise<void> {
    const { file, defaultValues, existingNames, form, setFormState, setAllFileData } = params;

    const updatedValues: Partial<ExperimentFormValues> = { ...defaultValues };
    updatedValues.filename = file.name;
    updatedValues.type = 'document';
    updatedValues.date = new Date(file.lastModified);
    updatedValues.name = generateUniqueName(`document_${file.name}`, existingNames);

    updateFormValues(form, updatedValues, setFormState, setAllFileData);
}

import { ExperimentFormValues } from "../extension-processors";
import React from "react";

export interface FileProcessorParams {
    file: File;
    defaultValues: any;
    samples: any[];
    existingNames: string[];
    form: any;
    setFormState: React.Dispatch<React.SetStateAction<ExperimentFormValues>>;
    setAllFileData: React.Dispatch<React.SetStateAction<Array<Partial<ExperimentFormValues>>>>;
}

export type FileProcessor = (params: FileProcessorParams) => Promise<void>;

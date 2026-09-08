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

/**
 * Thrown by a text processor when no data-format parser recognises the file.
 * The file is a document, not an experiment, so the caller routes the user to
 * attachments instead of adding it to the form.
 */
export class UnrecognisedDataFileError extends Error {
    constructor(readonly fileName: string) {
        super(`No parser recognised ${fileName}`);
        this.name = "UnrecognisedDataFileError";
    }
}

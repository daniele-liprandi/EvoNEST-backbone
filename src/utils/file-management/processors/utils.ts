import { ExperimentFormValues } from "../extension-processors";
import React from "react";

let newGeneratedFileNames: string[] = [];

export function generateUniqueName(baseName: string, existingNames: string[]): string {
    const existingSet = new Set(existingNames.map(name => name.toLowerCase().trim()));
    const existingGeneratedSet = new Set(newGeneratedFileNames.map(name => name.toLowerCase().trim()));

    let i = 0;
    let name = `${baseName}_${i}`;

    while (existingSet.has(name.toLowerCase().trim()) || existingGeneratedSet.has(name.toLowerCase().trim())) {
        i++;
        name = `${baseName}_${i}`;
    }

    newGeneratedFileNames.push(name);

    return name;
}

export function getSuggestedExperimentType(format: string): string | null {
    const formatToTypeMap: Record<string, string | null> = {
        'EVOMECT150': 'tensile_test',  // Specific for tensile test machines
    };
    
    return formatToTypeMap[format] || null;
}

export function updateFormValues(
    form: any, 
    updatedValues: Partial<ExperimentFormValues>, 
    setFormState: React.Dispatch<React.SetStateAction<ExperimentFormValues>>, 
    setAllFileData: React.Dispatch<React.SetStateAction<Array<Partial<ExperimentFormValues>>>>
) {
    Object.entries(updatedValues).forEach(([key, value]) => {
        if (value !== undefined) {
            form.setValue(key as keyof ExperimentFormValues, value);
        }
    });

    setFormState(prevState => ({
        ...prevState,
        ...updatedValues
    }));

    setAllFileData(prevAllFileData => [...prevAllFileData, updatedValues]);
}

export function resetGeneratedNames(): void {
    newGeneratedFileNames = [];
}

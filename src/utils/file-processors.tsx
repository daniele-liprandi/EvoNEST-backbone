import { z } from "zod";
import { toast } from "sonner";
import UTIF from 'utif';
import { getSampleIdbyName } from "@/hooks/sampleHooks";

export const experimentFormSchema = z.object({
    name: z.string().min(2, { message: "Samples name needs to be longer than 3 characters" }),
    responsible: z.any(),
    type: z.string(),
    sampleId: z.string().optional(),
    filename: z.string().optional(),
    filepath: z.string().optional(),
    date: z.date().optional(),
    notes: z.string().optional(),
    SpecimenName: z.string().optional(),
    includedData: z.any().optional(),
    metadata: z.array(z.object({
        key: z.string(),
        value: z.string(),
    })).optional(),
    originaldata: z.any().optional(),
    fileId: z.any().optional(),
})

export function determineFileType(file: File): string {
    // if file is larger than 20 MB, return 'large_file'
    if (file.size > 20 * 1024 * 1024) {
        return 'large_file';
    } else
        if (file.type === 'image/jpeg' || file.type === 'image/png') {
            return 'image';
        } else if (file.type === 'image/tiff' || file.type === 'image/tif' || file.name.toLowerCase().endsWith('.tif') || file.name.toLowerCase().endsWith('.tiff')) {
            return 'image_tiff';
        } else if (file.type === 'image/bmp') {
            return 'image_lossless';
        } else if (file.type === 'application/pdf' || file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/vnd.ms-excel' || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-powerpoint' || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
            return 'document';
        } else if (file.type === 'text/plain' || file.type === 'application/json' || file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.tsv')) {
            return 'plain_text';
        } else {
            return 'unknown';
        }
}



export type ExperimentFormValues = z.infer<typeof experimentFormSchema>

const updateFormValues = (form: any, updatedValues: Partial<ExperimentFormValues>, setFormState: React.Dispatch<React.SetStateAction<ExperimentFormValues>>, setAllFileData: React.Dispatch<React.SetStateAction<Array<Partial<ExperimentFormValues>>>>) => {
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
};

let newGeneratedFileNames: string[] = [];

function generateUniqueName(baseName: string, existingNames: string[]): string {
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


export async function handleFileSubmission(
    files: FileList | null | undefined,
    form: any,
    samples: any[],
    defaultValues: any,
    setFormState: React.Dispatch<React.SetStateAction<ExperimentFormValues>>,
    setAllFileData: React.Dispatch<React.SetStateAction<Array<Partial<ExperimentFormValues>>>>,
    existingNames: string[]
) {
    if (!files || files.length === 0) return;

    const processPlainTextFile = async (file: File): Promise<void> => {
        const reader = new FileReader();

        return new Promise<void>((resolve, reject) => {
            reader.onload = async function () {
                const text = reader.result;
                if (typeof text !== "string") return reject();

                const updatedValues: Partial<ExperimentFormValues> = { ...defaultValues };
                updatedValues.filename = file.name;
                updatedValues.date = new Date(file.lastModified);
                
                // Try to parse as JSON first (for experiment data)
                let parsedData = null;
                let isJsonFile = false;
                
                try {
                    if (file.name.toLowerCase().endsWith('.json') || file.type === 'application/json') {
                        parsedData = JSON.parse(text);
                        isJsonFile = true;
                    }
                } catch (e) {
                    // Not valid JSON, treat as plain text
                }
                
                if (isJsonFile && parsedData) {
                    // Handle JSON experiment data
                    updatedValues.type = 'experiment_data';
                    
                    // If the JSON already has includedData structure, use it directly
                    // Otherwise, treat the entire JSON as includedData
                    if (parsedData.includedData) {
                        updatedValues.includedData = parsedData.includedData;
                        // Also preserve any metadata from the JSON
                        if (parsedData.metadata) {
                            updatedValues.metadata = [
                                ...updatedValues.metadata || [],
                                ...(Array.isArray(parsedData.metadata) ? parsedData.metadata : [])
                            ];
                        }
                    } else {
                        updatedValues.includedData = parsedData;
                    }
                    
                    // Try to extract specimen name from the JSON root or metadata
                    const specimenName = parsedData.SpecimenName || 
                                       parsedData.metadata?.find((m: any) => m.key === 'SpecimenName')?.value;
                    
                    if (specimenName) {
                        updatedValues.SpecimenName = specimenName;
                        // Try to get sample ID from specimen name
                        try {
                            const sampleId = await getSampleIdbyName(specimenName, samples);
                            if (sampleId) {
                                updatedValues.sampleId = sampleId;
                            }
                        } catch (error) {
                            console.log("Could not find sample ID for specimen:", specimenName);
                        }
                    }
                    
                    // Generate name based on data content
                    updatedValues.name = generateUniqueName(
                        `experiment_${updatedValues.SpecimenName || file.name.replace(/\.[^/.]+$/, "")}`,
                        existingNames
                    );
                } else {
                    // Handle as plain text/document
                    updatedValues.type = 'document';
                    updatedValues.name = generateUniqueName(
                        `document_${file.name.replace(/\.[^/.]+$/, "")}`,
                        existingNames
                    );
                }
                
                updatedValues.metadata = [
                    { key: 'name', value: file.name },
                    { key: 'type', value: file.type },
                    { key: 'size', value: file.size.toString() },
                    { key: 'lastModified', value: file.lastModified.toString() },
                ];
                
                updateFormValues(form, updatedValues, setFormState, setAllFileData);
                resolve();
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    const processImageFile = async (file: File): Promise<void> => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function () {
                const img = new Image();
                img.onload = function () {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    canvas.width = 200;
                    const aspectRatio = img.width / img.height;
                    canvas.height = Math.round(canvas.width / aspectRatio);

                    ctx!.drawImage(img, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const updatedValues: Partial<ExperimentFormValues> = { ...defaultValues };

                            updatedValues.filename = file.name;
                            updatedValues.type = 'image';
                            updatedValues.date = new Date(file.lastModified);
                            updatedValues.name = `image_${file.name}`;
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

                            updatedValues.includedData = blob;

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
    };


    const processTiffFile = async (file: File): Promise<void> => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function () {
                try {
                    const buffer = reader.result as ArrayBuffer;
                    const ifds = UTIF.decode(buffer);
                    UTIF.decodeImage(buffer, ifds[0]);
                    const rgba = UTIF.toRGBA8(ifds[0]);

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = ifds[0].width;
                    canvas.height = ifds[0].height;
                    const imageData = ctx!.createImageData(canvas.width, canvas.height);
                    for (let i = 0; i < rgba.length; i++) {
                        imageData.data[i] = rgba[i];
                    }
                    ctx!.putImageData(imageData, 0, 0);

                    const thumbnailCanvas = document.createElement('canvas');
                    const thumbnailCtx = thumbnailCanvas.getContext('2d');
                    thumbnailCanvas.width = 200;
                    const aspectRatio = canvas.width / canvas.height;
                    thumbnailCanvas.height = Math.round(thumbnailCanvas.width / aspectRatio);
                    thumbnailCtx!.drawImage(canvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);

                    thumbnailCanvas.toBlob(async (blob) => {
                        if (blob) {
                            const updatedValues: Partial<ExperimentFormValues> = { ...defaultValues };

                            updatedValues.filename = file.name;
                            updatedValues.type = 'image';
                            updatedValues.date = new Date(file.lastModified);
                            updatedValues.name = `image_${file.name}`;
                            updatedValues.metadata = [
                                { key: 'name', value: file.name },
                                { key: 'type', value: file.type },
                                { key: 'size', value: file.size.toString() },
                                { key: 'lastModified', value: file.lastModified.toString() },
                                { key: 'originalWidth', value: canvas.width.toString() },
                                { key: 'originalHeight', value: canvas.height.toString() }
                            ];


                            updatedValues.includedData = blob;

                            updateFormValues(form, updatedValues, setFormState, setAllFileData);

                            resolve();
                        } else {
                            reject(new Error('Failed to create thumbnail'));
                        }
                    }, 'image/jpeg', 0.85);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    const processLosslessImageFile = async (file: File): Promise<void> => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function () {
                const img = new Image();
                img.onload = function () {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    canvas.width = 200;
                    const aspectRatio = img.width / img.height;
                    canvas.height = Math.round(canvas.width / aspectRatio);

                    ctx!.drawImage(img, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const updatedValues: Partial<ExperimentFormValues> = { ...defaultValues };

                            updatedValues.filename = file.name;
                            updatedValues.type = 'image';
                            updatedValues.date = new Date(file.lastModified);
                            updatedValues.name = `image_${file.name}`;
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

                            updatedValues.includedData = blob;

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

    const processDocumentFile = async (file: File): Promise<void> => {
        const updatedValues: Partial<ExperimentFormValues> = { ...defaultValues };
        updatedValues.filename = file.name;
        updatedValues.type = 'document';
        updatedValues.date = new Date(file.lastModified);
        updatedValues.name = `document_${file.name}`;

        updateFormValues(form, updatedValues, setFormState, setAllFileData);
    }

    const processFile = async (file: File) => {
        const fileType = determineFileType(file);

        switch (fileType) {
            case 'large_file':
                throw new EvalError(`The file "${file.name as string}" is too large to be processed in the current implementation of EvoNEST.`);
            case 'plain_text':
                await processPlainTextFile(file);
                break;
            case 'image':
                await processImageFile(file);
                break;
            case 'image_tiff':
                await processTiffFile(file);
                break;
            case 'image_lossless':
                await processLosslessImageFile(file);
                break;
            case 'document':
                await processDocumentFile(file);
                break;
            default:
                console.error('Unsupported file type');
                toast.error("Unsupported file type", {
                    description: `The file "${file.name}" is not supported.`,
                });
        }
    };

    const processFiles = async () => {
        try {
            for (let i = 0; i < files.length; i++) {
                await processFile(files[i]);
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw error
            }
        }
    };

    try {
        await processFiles();
    }
    catch (error: any) {
        console.error(error);
        throw error
    }
}
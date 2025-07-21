import UTIF from 'utif';
import { ExperimentFormValues } from "../extension-processors";
import { FileProcessorParams } from "./types";
import { updateFormValues } from "./utils";

// Processor metadata for experiment type discovery
export const tiffProcessorMetadata = {
    name: 'TiffProcessor',
    label: 'TIFF Image Processor',
    supportedFormats: ['.tiff', '.tif'],
    version: '1.0.0',
    description: 'Processes TIFF image files with specialized handling for scientific imaging',
    author: 'EvoNEST Team',
    supportedExperimentTypes: ['image_tiff'],
    primaryExperimentType: 'image_tiff',
    requiredFields: [],
    generatedTraits: [] // No traits are actually generated - only metadata extraction and thumbnail creation
};

export async function processTiffFile(params: FileProcessorParams): Promise<void> {
    const { file, defaultValues, form, setFormState, setAllFileData } = params;

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

                        updatedValues.dataFields = blob;

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
}

import { ExperimentFormValues } from "../extension-processors";
import { FileProcessorParams } from "./types";
import { updateFormValues } from "./utils";

// Processor metadata for experiment type discovery
export const losslessImageProcessorMetadata = {
  name: "LosslessImageProcessor",
  label: "Lossless Image Processor",
  supportedFormats: [".png", ".bmp", ".tiff", ".tif"],
  version: "1.0.0",
  description:
    "Processes lossless image formats preserving original quality for scientific analysis",
  author: "Daniele Liprandi",
  supportedExperimentTypes: ["image_lossless"],
  primaryExperimentType: "image_lossless",
  requiresStructuredData: false,
  requiredFields: [],
  generatedTraits: [], // No traits are actually generated - only metadata extraction and file processing
};

export async function processLosslessImageFile(params: FileProcessorParams): Promise<void> {
    const { file, defaultValues, form, setFormState, setAllFileData } = params;

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

                        updatedValues.dataFields = blob;

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

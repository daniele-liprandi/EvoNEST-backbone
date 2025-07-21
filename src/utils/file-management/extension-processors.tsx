import { z } from "zod";
import { toast } from "sonner";
import {
  processPlainTextFile,
  processImageFile,
  processTiffFile,
  processLosslessImageFile,
  processDocumentFile,
  resetGeneratedNames,
  type FileProcessorParams,
} from "./processors/index";

export const experimentFormSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Samples name needs to be longer than 3 characters" }),
  responsible: z.any(),
  type: z.string(),
  sampleId: z.string().optional(),
  filename: z.string().optional(),
  filepath: z.string().optional(),
  date: z.date().optional(),
  notes: z.string().optional(),
  sampleName: z.string().optional(),
  dataFields: z.any().optional(),
  metadata: z
    .array(
      z.object({
        key: z.string(),
        value: z.any(),
      })
    )
    .optional(),
  originaldata: z.any().optional(),
  fileId: z.any().optional(),
  suggestedExperimentType: z.string().optional(),
});

export function determineFileType(file: File): string {
  if (file.type === "image/jpeg" || file.type === "image/png") {
    return "image";
  } else if (
    file.type === "image/tiff" ||
    file.type === "image/tif" ||
    file.name.toLowerCase().endsWith(".tif") ||
    file.name.toLowerCase().endsWith(".tiff")
  ) {
    return "image_tiff";
  } else if (file.type === "image/bmp") {
    return "image_lossless";
  } else if (
    file.type === "application/pdf" ||
    file.type === "application/msword" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/vnd.ms-excel" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-powerpoint" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return "document";
  } else if (
    file.type === "text/plain" ||
    file.type === "application/json" ||
    file.name.toLowerCase().endsWith(".json") ||
    file.name.toLowerCase().endsWith(".txt") ||
    file.name.toLowerCase().endsWith(".csv") ||
    file.name.toLowerCase().endsWith(".tsv")
  ) {
    return "readable";
  } else {
    return "unknown";
  }
}

export type ExperimentFormValues = z.infer<typeof experimentFormSchema>;

export async function handleFileSubmission(
  files: FileList | null | undefined,
  form: any,
  samples: any[],
  defaultValues: any,
  setFormState: React.Dispatch<React.SetStateAction<ExperimentFormValues>>,
  setAllFileData: React.Dispatch<
    React.SetStateAction<Array<Partial<ExperimentFormValues>>>
  >,
  existingNames: string[]
) {
  if (!files || files.length === 0) return;

  // Reset generated names for this batch
  resetGeneratedNames();

  const processFile = async (file: File) => {
    const fileType = determineFileType(file);

    // Create parameters object for processors
    const params: FileProcessorParams = {
      file,
      defaultValues,
      samples,
      existingNames,
      form,
      setFormState,
      setAllFileData,
    };

    switch (fileType) {
      case "readable":
        await processPlainTextFile(params);
        break;
      case "image":
        await processImageFile(params);
        break;
      case "image_tiff":
        await processTiffFile(params);
        break;
      case "image_lossless":
        await processLosslessImageFile(params);
        break;
      case "document":
        await processDocumentFile(params);
        break;
      default:
        console.error("Unsupported file type");
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
        throw error;
      }
    }
  };

  try {
    await processFiles();
  } catch (error: any) {
    console.error(error);
    throw error;
  }
}

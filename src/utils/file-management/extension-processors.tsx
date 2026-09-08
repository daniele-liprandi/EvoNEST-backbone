import { z } from "zod";
import { toast } from "sonner";
import {
  processPlainTextFile,
  resetGeneratedNames,
  UnrecognisedDataFileError,
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
  // Images and documents are no longer experiments — they attach via <AttachmentPanel />.
  if (
    file.type === "text/plain" ||
    file.type === "application/json" ||
    file.name.toLowerCase().endsWith(".json") ||
    file.name.toLowerCase().endsWith(".txt") ||
    file.name.toLowerCase().endsWith(".csv") ||
    file.name.toLowerCase().endsWith(".dat") ||
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
    if (determineFileType(file) !== "readable") {
      toast.error("Not an experiment file", {
        description: `"${file.name}" is not instrument data. Attach images and documents to a sample, trait or experiment instead.`,
      });
      return;
    }

    const params: FileProcessorParams = {
      file,
      defaultValues,
      samples,
      existingNames,
      form,
      setFormState,
      setAllFileData,
    };

    try {
      await processPlainTextFile(params);
    } catch (error) {
      if (error instanceof UnrecognisedDataFileError) {
        toast.error("Not an experiment file", {
          description: `No parser recognised "${file.name}". Add a parser if it holds instrument data, otherwise attach it as a document.`,
        });
        return;
      }
      throw error;
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

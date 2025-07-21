/*
readable-processor.ts

This file contains the logic to process plain text files, including JSON and other text formats, to extract machine readable files and update the form from profile-form-experiments.tsx.
*/

import { getSampleIdbyName } from "@/hooks/sampleHooks";
import { dataFormatParserRegistry } from "../readable-data-extractors/index.js";
import { ExperimentFormValues } from "../extension-processors";
import { FileProcessorParams } from "./types";
import { generateUniqueName, getSuggestedExperimentType, updateFormValues,} from "@/utils/file-management/processors/utils";
import { ParsedDataResult } from "../readable-data-extractors/types.js";

export async function processPlainTextFile(
  params: FileProcessorParams
): Promise<void> {
  const {
    file,
    defaultValues,
    samples,
    existingNames,
    form,
    setFormState,
    setAllFileData,
  } = params;
  const reader = new FileReader();

  return new Promise<void>((resolve, reject) => {
    reader.onload = async function () {
      const text = reader.result;
      if (typeof text !== "string") return reject();

      const updatedValues: Partial<ExperimentFormValues> = { ...defaultValues };
      updatedValues.filename = file.name;
      updatedValues.date = new Date(file.lastModified);

      /* -------------------------------------------------------------------------- */
      /*                                    JSON                                    */
      /* -------------------------------------------------------------------------- */

      // Try to parse as JSON first (for experiment data)
      let parsedData = null;
      let isJsonFile = false;

      try {
        if (
          file.name.toLowerCase().endsWith(".json") ||
          file.type === "application/json"
        ) {
          parsedData = JSON.parse(text);
          isJsonFile = true;
        }
      } catch (e) {
        // Not valid JSON, treat as plain text
      }

      /* --------------------------- ALREADY PARSED JSON -------------------------- */
      if (
        isJsonFile &&
        parsedData &&
        parsedData.dataFields &&
        parsedData.metadata
      ) {
        // Handle JSON experiment data
        updatedValues.type = "experiment_data";

        // If the JSON already has dataFields structure, use it directly
        // Otherwise, treat the entire JSON as dataFields
        updatedValues.dataFields = parsedData.dataFields;
        // Also preserve any metadata from the JSON
        if (parsedData.metadata) {
          updatedValues.metadata = [
            ...(updatedValues.metadata || []),
            ...(Array.isArray(parsedData.metadata) ? parsedData.metadata : []),
          ];
        }

        updatedValues.metadata = [
          ...(updatedValues.metadata || []),
          ...(Array.isArray(parsedData.metadata) ? parsedData.metadata : []),
        ];
        // else, generate metadata from file properties

        // Try to extract sample name from the JSON root or metadata
        const possible_sample_name_fields_name = [
          "sampleName",
          "specimenName",
          "SpecimenName",
          "specimen_name",
          "sample_name",
        ];
        const sampleName =
          possible_sample_name_fields_name
            .map((field) => parsedData[field])
            .find((name) => name) ||
          possible_sample_name_fields_name
            .map((field) => parsedData.metadata?.[field])
            .find((name) => name);

        if (sampleName) {
          updatedValues.sampleName = sampleName;
          // Try to get sample ID from specimen name
          try {
            const sampleId = await getSampleIdbyName(sampleName, samples);
            if (sampleId) {
              updatedValues.sampleId = sampleId;
            }
          } catch (error) {
            console.log("Could not find sample ID for specimen:", sampleName);
          }
        }

        // Generate name based on data content
        updatedValues.name = generateUniqueName(
          `json_${
            updatedValues.sampleName || file.name.replace(/\.[^/.]+$/, "")
          }`,
          existingNames
        );
      } else {
        /* -------------------------------------------------------------------------- */
        /*                           PARSING READABLE FILES                           */
        /* -------------------------------------------------------------------------- */
        /*                  This includes csv, txt, non parsed jsons                  */
        /* -------------------------------------------------------------------------- */
        const fileMetadata = {
            filename: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
        };

        // Try to parse with data format parsers
        const parsedData = dataFormatParserRegistry.parse(text, fileMetadata) as ParsedDataResult;

        if (parsedData) {
          // Successfully parsed with a format parser
          updatedValues.type = parsedData.experimentData.type || "readable";
          updatedValues.dataFields = parsedData;

          // Suggest experiment type based on detected format
          const detectedFormat = parsedData.format;
          const suggestedType = getSuggestedExperimentType(detectedFormat);
          if (suggestedType) {
            updatedValues.suggestedExperimentType = suggestedType;
          }

          // Try to extract sample name from parsed data
          const sampleName =
            parsedData.experimentData.sampleId

          if (sampleName) {
            updatedValues.sampleName = sampleName;
            try {
              const sampleId = await getSampleIdbyName(sampleName, samples);
              if (sampleId) {
                updatedValues.sampleId = sampleId;
              }
            } catch (error) {
              console.log(
                "Could not find sample ID for specimen:",
                sampleName
              );
            }
          }

          // Generate name based on parsed data format
          const formatName = detectedFormat || "parsed";
          updatedValues.name = generateUniqueName(
            `${formatName.toLowerCase()}_${
              updatedValues.sampleName || file.name.replace(/\.[^/.]+$/, "")
            }`,
            existingNames
          );

          // Add parsing information to metadata
          updatedValues.metadata = [
            { key: "name", value: file.name },
            { key: "type", value: file.type },
            { key: "size", value: file.size.toString() },
            { key: "lastModified", value: file.lastModified.toString() },
            { key: "parsedFormat", value: detectedFormat },
            {
              key: "recordCount",
              value:
                (parsedData as any).summary?.recordCount?.toString() || "0",
            },
            ...(suggestedType
              ? [{ key: "suggestedExperimentType", value: suggestedType }]
              : []),
          ];
        } else {
          // No format parser could handle it - treat as plain document
          updatedValues.type = "document";
          updatedValues.dataFields = text; // Keep raw text
          updatedValues.name = generateUniqueName(
            `document_${file.name.replace(/\.[^/.]+$/, "")}`,
            existingNames
          );

          updatedValues.metadata = [
            { key: "name", value: file.name },
            { key: "type", value: file.type },
            { key: "size", value: file.size.toString() },
            { key: "lastModified", value: file.lastModified.toString() },
          ];
        }
      }

      updateFormValues(form, updatedValues, setFormState, setAllFileData);
      resolve();
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

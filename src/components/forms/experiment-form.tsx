/*
experiment-form.tsx

This form is spawned by smart-vaul.tsx

This form is used to upload new files, and create the required experiment entry and the possible traits entry.



*/

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { CircleNotch } from "@phosphor-icons/react"

import { ComboFormBox } from "@/components/forms/combo-form-box"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from 'react'
import {
    Form,
    FormControl, FormField,
    FormItem,
    FormLabel
} from "@/components/ui/form"
import InfoHover from "@/components/ui/custom/info-hover"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { getUserIdByName } from "@/hooks/userHooks"
import {
    checkParserSupport,
    getParserInfo,
    getUniqueParserOptions,
    validateExperimentType
} from "@/utils/file-management/experimentTypeDiscovery"
import { prepend_path } from "@/lib/utils"
import { toast } from "sonner"
import { mutate } from "swr"
import { ExperimentFormValues, experimentFormSchema, handleFileSubmission } from "@/utils/file-management/extension-processors"
import { Button } from "@/components/ui/button"
import { linkFileToEntry, uploadFile } from "@/utils/handlers/fileHandlers"
import { ParserPreview } from "./ParserPreview"
import { DataFormatPreview } from "./DataFormatPreview"

export function ExperimentForm({ users, samples, user, experiments, defaultFileList, onSuccess }: { users: any, samples: any, user: any, experiments: any, defaultFileList?: FileList, onSuccess?: () => void }) {
    const [allFileData, setAllFileData] = useState<Array<Partial<ExperimentFormValues>>>([]);
    const [files, setFiles] = useState<FileList | null>(null);
    const [checkSaveFile, setCheckSaveFile] = useState(true);


    const defaultValues = {
        name: "",
        responsible: getUserIdByName(user?.name, users),
        sampleId: "",
        filename: "",
        type: "",
        date: new Date(),
        notes: "",
    };

    const form = useForm<z.infer<typeof experimentFormSchema>>({
        resolver: zodResolver(experimentFormSchema),
        defaultValues: defaultValues,
        mode: "onChange", // This makes validation happen immediately when fields change
    })
    const [formState, setFormState] = useState(form.getValues());


    const selectedType = useWatch({
        control: form.control,
        name: "type",
    });
    useEffect(() => {
        if (defaultFileList) {
            processDefaultFileList(defaultFileList);
        }
    });

    let existingNames: string[];

    try {
        existingNames = experiments.map((experiment: { name: string }) => experiment.name.toLowerCase().trim());
    } catch (error) {
        console.error("Error fetching existing experiment names", error);
        existingNames = [];
        return;
    }

    const processDefaultFileList = async (defaultFileList: FileList) => {
        try {
            setFiles(defaultFileList);
            await handleFileSubmission(defaultFileList, form, samples, defaultValues, setFormState, setAllFileData, existingNames);
        } catch (error) {
            console.error('Error processing default file:', error);
            toast.error("Error!", {
                description: "Failed to process the default file.",
            });
        }
    };

    async function onSubmit(formValues: ExperimentFormValues) {
        const method = 'create';
        const endpointexperiment = `${prepend_path}/api/experiments`;
        let fileId: string | null = null;
        // Some per-file branches below report a failure via toast without
        // rejecting their promise, so Promise.all alone can't tell success
        // from failure. Track it explicitly so the dialog only closes when
        // every file actually made it.
        let hadFailure = false;

        // Validate experiment type and data compatibility
        if (checkParserSupport(formValues.type)) {
            const validationErrors: string[] = [];
            
            allFileData.forEach((fileValues, index) => {
                const fileName = fileValues.filename || `File ${index + 1}`;
                const validation = validateExperimentType(formValues.type, fileValues);
                if (!validation.valid) {
                    validationErrors.push(`${fileName}: ${validation.message}`);
                }
                
                // Only validate structured data format if experimentData exists
                if (fileValues.dataFields && fileValues.dataFields.experimentData) {
                    // Check for required experimentData structure
                    if (!fileValues.dataFields.experimentData.name) {
                        validationErrors.push(`${fileName}: Missing experiment name in parsed data`);
                    }
                    if (!fileValues.dataFields.experimentData.type) {
                        validationErrors.push(`${fileName}: Missing experiment type in parsed data`);
                    }
                    if (!fileValues.dataFields.format) {
                        validationErrors.push(`${fileName}: Missing format information in parsed data`);
                    }
                }
                // Remove the strict requirement for structured data - let parsers handle their own validation
            });

            if (validationErrors.length > 0) {
                toast.error("Data Validation Failed", {
                    description: validationErrors.join('\n'),
                    duration: 6000
                });
                return;
            }
        }

        try {
            // Submit experiment data for each file
            const experimentRequests = allFileData.map(async (fileValues) => {

                // A file only reaches allFileData once a parser has structured
                // it. Anything else was turned away at upload with a message to
                // attach it instead, so this guard is defensive.
                if (!fileValues.dataFields || !fileValues.dataFields.experimentData) {
                    toast.error("Not an experiment file", {
                        description: `"${fileValues.filename || 'This file'}" was not parsed into an experiment. Attach it to a record instead.`,
                    });
                    hadFailure = true;
                    return;
                }

                // Structured experiment data from a parser, with form fields layered on top.
                let experimentData: any = { ...fileValues.dataFields.experimentData };
                experimentData.responsible = formValues.responsible;

                // For several files, prefer each file's parsed sample and name; for one, the form wins.
                if (allFileData.length > 1) {
                    experimentData.sampleId = fileValues.sampleId || formValues.sampleId;
                    experimentData.name = fileValues.name || formValues.name;
                } else {
                    experimentData.sampleId = formValues.sampleId;
                    experimentData.name = formValues.name;
                }

                if (formValues.notes) experimentData.notes = formValues.notes;
                if (formValues.filepath) experimentData.filepath = formValues.filepath;
                experimentData.type = formValues.type;

                if (files && checkSaveFile) {
                    try {
                        for (let i = 0; i < files.length; i++) {
                            fileId = await uploadFile(files[i], formValues.type, {
                                deferredLink: true,
                                mediaType: formValues.type,
                            });
                            experimentData = { ...experimentData, fileId: fileId };
                        }
                    } catch (error) {
                        console.error("Error uploading file:", error);
                        toast.error("Failed to upload file");
                        hadFailure = true;
                        return;
                    }
                }

                if (fileValues.dataFields && fileValues.dataFields.experimentData) {
                    // Handle structured experiment data with embedded traits
                    try {
                        const experimentResponse = await fetch(endpointexperiment, {
                            method: "POST",
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                method: method,
                                ...experimentData
                            })
                        });

                        if (!experimentResponse.ok) {
                            const errorData = await experimentResponse.json();
                            toast.error("Error!", {
                                description: errorData.error || "Error submitting structured experiment data.",
                            });
                            throw new Error(errorData.error || "Error submitting structured experiment data.");
                        } else {
                            const result = await experimentResponse.json();
                            
                            // If we have a file, link it to the newly created experiment
                            if (fileId) {
                                await linkFileToEntry(fileId, 'experiment', result.experimentId || result.id);
                            }
                            
                            // Enhanced success message based on parsed data
                            let successMessage = `Submitted ${fileValues.dataFields.format} experiment: ${experimentData.name}`;
                            
                            // Add trait count if available
                            if (experimentData.traits && experimentData.traits.length > 0) {
                                successMessage += ` with ${experimentData.traits.length} traits automatically extracted`;
                            }
                            
                            // Add data record count if available
                            if (experimentData.data?.summary?.recordCount) {
                                successMessage += ` (${experimentData.data.summary.recordCount.toLocaleString()} data records)`;
                            }
                            
                            toast.success(successMessage);
                        }
                    } catch (error) {
                        console.error("Error submitting structured experiment data:", error);
                        toast.error("Failed to submit structured experiment data");
                        throw error;
                    }
                }
            });

            await Promise.all(experimentRequests);

            mutate(`${prepend_path}/api/experiments`);
            mutate(`${prepend_path}/api/traits`);

            if (!hadFailure) {
                setAllFileData([]);
                onSuccess?.();
            }

        } catch (error) {
            console.error("Error submitting the form", error);
            toast.error("Error!", {
                description: "Error submitting the form. Please try again.",
            });
        }
    }

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue={"General"} className="w-auto">
            <TabsList>
              <TabsTrigger value="General">General</TabsTrigger>
              <TabsTrigger value="Details">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="General" className="space-y-4">
              <ComboFormBox
                control={form.control}
                setValue={form.setValue}
                name="responsible"
                options={users.map((user: { _id: any; name: any }) => ({
                  value: user._id,
                  label: user.name,
                }))}
                fieldlabel={"Responsible"}
                description={""}
              />
              <Label htmlFor="file">
                Import file{" "}
                <InfoHover text='When uploading multiple files at once, the "SpecimenName" inside each file needs to be identical to a sample name.' />
              </Label>
              {defaultFileList && (
                <div className="space-y-1">
                  <Label className="p-1" htmlFor="file">
                    File(s) selected: {defaultFileList.length} files
                  </Label>
                  {allFileData.length > 0 && (
                    <div className="text-xs text-gray-600 space-y-1 ml-2">
                      {allFileData.slice(0, 3).map((fileInfo, index) => (
                        <div key={index}>
                          • {fileInfo.filename} {fileInfo.sampleName && `(${fileInfo.sampleName})`}
                        </div>
                      ))}
                      {allFileData.length > 3 && (
                        <div className="text-gray-500">... and {allFileData.length - 3} more</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {!defaultFileList && (
                <Input
                  id="file"
                  type="file"
                  multiple
                  onChange={async (e) => {
                    try {
                      if (e.target.files) {
                        await handleFileSubmission(
                          e.target.files,
                          form,
                          samples,
                          defaultValues,
                          setFormState,
                          setAllFileData,
                          existingNames
                        );
                        setFiles(e.target.files);
                      }
                    } catch (error: any) {
                      console.error("Error processing files:", error);
                      toast.error("Error!", {
                        description: error.message,
                      });
                    }
                  }}
                />
              )}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Experiment Type
                      <InfoHover text="Select the type of experiment. Files are automatically parsed by data format parsers, and compatible experiment types will generate traits automatically." />
                      {/* Show auto-detection indicator */}
                      {allFileData.some(
                        (fileData) =>
                          fileData.suggestedExperimentType === field.value
                      ) && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Auto-detected
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <ComboFormBox
                        control={form.control}
                        setValue={form.setValue}
                        name="type"
                        options={[
                          ...getUniqueParserOptions(),
                        ]}
                        fieldlabel=""
                        description=""
                      />
                    </FormControl>
                    {field.value && checkParserSupport(field.value) && (
                      <div className="text-sm text-green-600 mt-1">
                        ✓ This experiment type has automatic trait generation
                      </div>
                    )}
                    {field.value &&
                      !checkParserSupport(field.value) &&
                      field.value !== "unknown" && (
                        <div className="text-sm text-amber-600 mt-1">
                          ⚠ No automatic trait generation available for this
                          type
                        </div>
                      )}
                    {/* Show format detection info */}
                    {allFileData.length > 0 &&
                      allFileData.some(
                        (fileData) => fileData.dataFields?.format
                      ) && (
                        <div className="text-xs text-blue-600 mt-1">
                          Detected formats:{" "}
                          {allFileData
                            .filter((fileData) => fileData.dataFields?.format)
                            .map((fileData) => fileData.dataFields.format)
                            .join(", ")}
                        </div>
                      )}
                  </FormItem>
                )}
              />

              {/* Data Format Processing Status */}
              <DataFormatPreview allFileData={allFileData} />

              {/* Parser Preview */}
              <ParserPreview
                hasParserSupport={checkParserSupport(selectedType)}
                experimentType={selectedType}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experiment Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Choose file to generate name suggestion"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Optional notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                  </FormItem>
                )}
              />

            </TabsContent>
            <TabsContent value="Details" className="space-y-4">
              {/* Sample selection - only show dropdown for single file, show list for multiple */}
              {allFileData.length <= 1 ? (
                <FormField
                  control={form.control}
                  name="sampleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Sample{" "}
                        <InfoHover text="Select the sample this experiment is associated with" />
                      </FormLabel>
                      <FormControl>
                        <ComboFormBox
                          control={form.control}
                          setValue={form.setValue}
                          name="sampleId"
                          options={samples.map(
                            (sample: { _id: any; name: any }) => ({
                              value: sample._id,
                              label: sample.name,
                            })
                          )}
                          fieldlabel=""
                          description=""
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ) : (
                <div className="space-y-2">
                  <FormLabel>
                    Specimens (Auto-detected from files)
                    <InfoHover text="Each file will be assigned to its parsed specimen name. Make sure the SpecimenName in the file matches an existing sample." />
                  </FormLabel>
                  <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                    {allFileData.map((fileInfo, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{fileInfo.filename}</span>
                        <Badge variant={fileInfo.sampleId ? "green" : "orange"}>
                          {fileInfo.sampleName || 'No specimen detected'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {allFileData.some(f => !f.sampleId) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Some files do not have a matching sample. Please ensure specimen names in files match existing sample names.
                    </p>
                  )}
                </div>
              )}

              {/* Parser Preview in Details tab */}
              {selectedType && checkParserSupport(selectedType) && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">
                    Automatic Trait Generation
                  </h4>
                  <ParserPreview
                    experimentType={selectedType}
                    hasParserSupport={checkParserSupport(selectedType)}
                    parserInfo={getParserInfo(selectedType)}
                  />
                </div>
              )}

              {/* File Processing Details */}
              {allFileData.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">
                    File Processing Details
                  </h4>
                  <div className="space-y-2">
                    {allFileData.map((fileInfo, index) => (
                      <div
                        key={index}
                        className="rounded border bg-muted/40 p-3 text-sm"
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <span className="font-medium">
                            {fileInfo.filename || `File ${index + 1}`}
                          </span>
                          <Badge variant={fileInfo.type === "experiment_data" ? "green" : "secondary"}>
                            {fileInfo.type}
                          </Badge>
                        </div>

                        {fileInfo.type === "experiment_data" &&
                          fileInfo.dataFields && (
                            <div className="text-xs text-gray-600">
                              <div>Format: {fileInfo.dataFields.format}</div>
                              {fileInfo.dataFields.summary?.recordCount && (
                                <div>
                                  Records:{" "}
                                  {fileInfo.dataFields.summary.recordCount.toLocaleString()}
                                </div>
                              )}
                              {fileInfo.dataFields.columns && (
                                <div>
                                  Columns:{" "}
                                  {fileInfo.dataFields.columns.join(", ")}
                                </div>
                              )}
                            </div>
                          )}

                        {fileInfo.sampleName && (
                          <div className="text-xs text-gray-600 mt-1">
                            Specimen: {fileInfo.sampleName}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <Button
            type="submit"
            disabled={allFileData.length === 0 || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <CircleNotch className="animate-spin" />}
            Submit
          </Button>
        </form>
      </Form>
    );
}

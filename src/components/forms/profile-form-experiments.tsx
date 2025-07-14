import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { ComboFormBox } from "@/components/forms/combo-form-box"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSampleIdbyName } from "@/hooks/sampleHooks"
import { useEffect, useState } from 'react'

import {
    Form,
    FormControl, FormField,
    FormItem,
    FormLabel
} from "@/components/ui/form"
import InfoHover from "@/components/ui/custom/info-hover"
import { Input } from "@/components/ui/input"
import { getUserIdByName } from "@/hooks/userHooks"
import { useExperimentParsers, useParserValidation } from "@/hooks/useExperimentParsers"
import { prepend_path } from "@/lib/utils"
import { toast } from "sonner"
import { mutate } from "swr"
import { ExperimentFormValues, experimentFormSchema, handleFileSubmission } from "@/utils/file-processors"
import { Button } from "@/components/ui/button"
import { linkFileToEntry, uploadFile } from "@/utils/handlers/fileHandlers"
import { ParserPreview } from "./ParserPreview"

export function ProfileFormExperiments({ users, samples, user, experiments, defaultFileList }: { users: any, samples: any, user: any, experiments: any, defaultFileList?: FileList }) {
    const [allFileData, setAllFileData] = useState<Array<Partial<ExperimentFormValues>>>([]);
    const [files, setFiles] = useState<FileList | null>(null);
    const [checkSaveFile, setCheckSaveFile] = useState(true);
    const [largeFile, setLargeFile] = useState(false);

    // Parser system hooks
    const { getParserSupportedTypes, checkParserSupport, getParserInfo, getUniqueParserOptions } = useExperimentParsers();
    const { validateExperimentType } = useParserValidation();

    console.log(user);

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
    }, [defaultFileList]);

    let existingNames: string[];

    try {
        existingNames = experiments.map((experiment: { name: string }) => experiment.name.toLowerCase().trim());
    } catch (error) {
        console.log("Error fetching existing experiment names", error);
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

        // Validate experiment type and data compatibility
        if (checkParserSupport(formValues.type)) {
            const validationErrors: string[] = [];
            
            allFileData.forEach((fileValues, index) => {
                const validation = validateExperimentType(formValues.type, fileValues);
                if (!validation.valid) {
                    validationErrors.push(`File ${index + 1}: ${validation.message}`);
                }
            });

            if (validationErrors.length > 0) {
                toast.error("Data Validation Failed", {
                    description: validationErrors.join('\n')
                });
                return;
            }
        }

        try {
            // Submit experiment data for each file
            const experimentRequests = allFileData.map(async (fileValues) => {

                let experimentData = {
                    name: formValues.name,
                    responsible: formValues.responsible,
                    sampleId: formValues.sampleId,
                    notes: formValues.notes,
                    filepath: formValues.filepath,
                    type: formValues.type, // Keep the user-selected experiment type
                    ...fileValues,
                    // Preserve the experiment type (don't let fileValues override it)
                    type: formValues.type,  
                };

                // ensure sampleId is from form
                experimentData.sampleId = formValues.sampleId;

                if (allFileData.length > 1 && fileValues.name) {
                    experimentData.name = fileValues.name;
                    experimentData.sampleId = fileValues.sampleId;
                }

                if (files && checkSaveFile) {
                    try {
                        for (let i = 0; i < files.length; i++) {
                            fileId = await uploadFile(files[i], formValues.type, {
                                deferredLink: true,
                                mediaType: formValues.type,
                            });
                            console.log("File uploaded with ID:", fileId);
                            experimentData = { ...experimentData, fileId: fileId };
                        }
                    } catch (error) {
                        console.error("Error uploading file:", error);
                        toast.error("Failed to upload file");
                        return;
                    }
                }

                if (formValues.type === "image" && fileValues.type === 'image' && fileValues.includedData instanceof Blob) {
                    console.log("Experiment data bef:", experimentData);
                    experimentData.sampleId = formValues.sampleId;
                    console.log("Experiment data aft:", experimentData);
                    return new Promise<void>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(fileValues.includedData);
                        reader.onloadend = async function () {
                            const base64data = reader.result as string;
                            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
                            const base64Image = base64data.split(',')[1];

                            experimentData.includedData = base64Image;

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
                                        description: errorData.error || "Error submitting the form.",
                                    });
                                    reject(new Error(errorData.error || "Error submitting the form."));
                                } else {
                                    const result = await experimentResponse.json();

                                    console.log("Experiment created:", result);
                                    // If we have a file, link it to the newly created experiment
                                    if (fileId) {
                                        await linkFileToEntry(fileId, 'experiment', result.id);
                                    }
                                    toast.success("Submitted image as " + experimentData.name + " !");
                                    resolve();
                                }
                            } catch (error) {
                                console.error("Error submitting image experiment:", error);
                                reject(error);
                            }
                        };
                        reader.onerror = reject;
                    });
                } else if (formValues.type === 'document' && fileValues.type === 'document') {
                    console.log("Experiment data bef:", experimentData);
                    experimentData.sampleId = formValues.sampleId;
                    console.log("Experiment data aft:", experimentData);
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
                                description: errorData.error || "Error submitting the form.",
                            });
                        } else {
                            const result = await experimentResponse.json();
                            // If we have a file, link it to the newly created experiment
                            if (fileId) {
                                await linkFileToEntry(fileId, 'experiment', result.experimentId);
                            }
                            toast.success("Submitted document as " + experimentData.name + " !");
                        }
                    }
                    catch (error) {
                        console.error("Error uploading file:", error);
                        toast.error("Failed to upload file");
                    }
                } else if (checkParserSupport(formValues.type) && fileValues.type === 'experiment_data') {
                    // Handle experiment data with parser support (JSON files with experiment data)
                    experimentData.sampleId = formValues.sampleId;
                    
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
                                description: errorData.error || "Error submitting experiment.",
                            });
                        } else {
                            const result = await experimentResponse.json();
                            
                            // If we have a file, link it to the newly created experiment
                            if (fileId) {
                                await linkFileToEntry(fileId, 'experiment', result.experimentId || result.id);
                            }
                            
                            toast.success("Submitted experiment data as " + experimentData.name + " with automatic trait generation!");
                        }
                    } catch (error) {
                        console.error("Error submitting experiment data:", error);
                        toast.error("Failed to submit experiment");
                    }
                }
            });

            await Promise.all(experimentRequests);

            mutate(`${prepend_path}/api/experiments`);
            mutate(`${prepend_path}/api/traits`);

            setAllFileData([]);

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
                        {selectedType === 'image' && <TabsTrigger value="image">Image</TabsTrigger>}
                        {selectedType === 'document' && <TabsTrigger value="document">Document</TabsTrigger>}
                    </TabsList>
                    <TabsContent value="General" className="space-y-4">
                        <ComboFormBox
                            control={form.control}
                            setValue={form.setValue}
                            name="responsible"
                            options={users.map((user: { _id: any; name: any }) => ({ value: user._id, label: user.name }))}
                            fieldlabel={"Responsible"}
                            description={""}
                        />
                        <Label htmlFor="file">Import file <InfoHover text='When uploading multiple files at once, the "SpecimenName" inside each file needs to be identical to a sample name.' /></Label>
                        {defaultFileList &&
                            <Label className="p-1" htmlFor="file">File(s) selected: {defaultFileList.length} files.
                            </Label>
                        }
                        {!defaultFileList &&
                            <Input id="file" type="file" multiple
                                onChange={
                                    async e => {
                                        try {
                                            await handleFileSubmission(e.target.files, form, samples, defaultValues, setFormState, setAllFileData, existingNames);
                                            setFiles(e.target.files);
                                            setLargeFile(false);
                                        } catch (error: any) {
                                            setLargeFile(true);
                                            console.log("Error processing files:", error);
                                            toast.error("Error!", {
                                                description: error.message
                                            });
                                        }
                                    }
                                }
                            />
                        }
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Experiment Type <InfoHover text='Select the type of experiment. Each type has a specialized parser that will automatically generate traits from your data.' /></FormLabel>
                                    <FormControl>
                                        <ComboFormBox
                                            control={form.control}
                                            setValue={form.setValue}
                                            name="type"
                                            options={[
                                                // Legacy file types (for backward compatibility)
                                                { value: "image", label: "Image File" },
                                                { value: "document", label: "Document" },
                                                { value: "unknown", label: "Unknown File Type" },
                                                // Parser-supported types - show unique parsers only
                                                ...getUniqueParserOptions()
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
                                    {field.value && !checkParserSupport(field.value) && !['image', 'document', 'unknown'].includes(field.value) && (
                                        <div className="text-sm text-amber-600 mt-1">
                                            ⚠ No automatic trait generation available for this type
                                        </div>
                                    )}
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Experiment Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Choose file to generate name suggestion" />
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
                                        <textarea
                                            {...field}
                                            placeholder=" "
                                            rows={3}
                                            style={{ width: '100%', resize: 'vertical', minHeight: '60px', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc' }}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        {largeFile &&
                            <FormField
                                control={form.control}
                                name="filepath"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>The file is too large to be processed in the current implementation of EvoNEST. Instead please insert the file path on the original machine here</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="File Path" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        }
                    </TabsContent>
                    <TabsContent value="Details" className="space-y-4">
                        <FormField
                            control={form.control}
                            name="sampleId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sample <InfoHover text='Select the sample this experiment is associated with' /></FormLabel>
                                    <FormControl>
                                        <ComboFormBox
                                            control={form.control}
                                            setValue={form.setValue}
                                            name="sampleId"
                                            options={samples.map((sample: { _id: any; name: any }) => ({ value: sample._id, label: sample.name }))}
                                            fieldlabel=""
                                            description=""
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        
                        {/* Parser Preview in Details tab */}
                        {selectedType && checkParserSupport(selectedType) && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium mb-2">Automatic Trait Generation</h4>
                                <ParserPreview 
                                    experimentType={selectedType} 
                                    hasParserSupport={checkParserSupport(selectedType)}
                                    parserInfo={getParserInfo(selectedType)}
                                />
                            </div>
                        )}
                        
                        <div className="mt-4 p-4 bg-gray-50 rounded border">
                            <h4 className="font-medium mb-2">Experiment Details</h4>
                            <div className="text-sm space-y-1">
                                <p><strong>Specimen name:</strong> {formState.SpecimenName}</p>
                                <p><strong>File Name:</strong> {formState.filename}</p>
                                <p><strong>File Path:</strong> {formState.filepath}</p>
                                <p><strong>Responsible:</strong> {users.find((u: any) => u._id === formState.responsible)?.name}</p>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="image" className="space-y-4">
                        <div>
                            <p> Specimen name: {formState.SpecimenName} </p>
                            <p> Specimen ID: {formState.sampleId} </p>
                            <p> File Name: {formState.filename} </p>
                            <p> File Path: {formState.filepath} </p>
                            <p> Responsible ID: {formState.responsible} </p>
                        </div>
                        <FormField
                            control={form.control}
                            name="SpecimenName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel> Update specimen name if the specimen ID is not found</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Specimen name"
                                            onChange={async (e) => {
                                                const specimenName = e.target.value;
                                                form.setValue("SpecimenName", specimenName);
                                                const sampleId = await getSampleIdbyName(specimenName, samples);
                                                console.log("Sample ID:", sampleId);
                                                form.setValue("sampleId", sampleId);
                                                setFormState({ ...formState, SpecimenName: specimenName, sampleId: sampleId });
                                            }} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </TabsContent>
                    <TabsContent value="document" className="space-y-4">
                        <div>
                            <p> Specimen name: {formState.SpecimenName} </p>
                            <p> Specimen ID: {formState.sampleId} </p>
                            <p> File Name: {formState.filename} </p>
                            <p> File Path: {formState.filepath} </p>
                        </div>
                        <FormField
                            control={form.control}
                            name="SpecimenName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel> Update specimen name if the specimen ID is not found</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Specimen name"
                                            onChange={async (e) => {
                                                const specimenName = e.target.value;
                                                form.setValue("SpecimenName", specimenName);
                                                const sampleId = await getSampleIdbyName(specimenName, samples);
                                                form.setValue("sampleId", sampleId);
                                                setFormState({ ...formState, SpecimenName: specimenName, sampleId: sampleId });
                                            }} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </TabsContent>
                </Tabs>
                <Button type="submit" disabled={!form.formState.isValid || allFileData.length === 0}>
                    Submit
                </Button>
            </form>
        </Form>
    );
}

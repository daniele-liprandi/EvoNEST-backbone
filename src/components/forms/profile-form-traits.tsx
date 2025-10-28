"use client"

import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { mutate } from "swr"

import { ComboFormBox } from "@/components/forms/combo-form-box"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { prepend_path } from "@/lib/utils"
import { toast } from "sonner"
import { useConfigTypes } from "@/hooks/useConfigTypes"
import { LabelType } from "@/utils/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useMemo, useState } from "react"
import { getUserIdByName } from "@/hooks/userHooks"
import { Textarea } from "../ui/textarea"
import { linkFileToEntry, uploadFiles } from "@/utils/handlers/fileHandlers"

const formSchema = z.object({
    responsible: z.any(),
    sampleId: z.string(),
    type: z.string(),
    date: z.date(),
    unit: z.string().optional(),
    detail: z.string().optional(),
    measurements: z.string().optional(),
    equipment: z.string().optional(),
    nfibres: z.string().optional(),
    files: z.any().optional(),
    notes: z.string().optional(),
    categoricalValue: z.string().optional(),
    categoricalValues: z.array(z.string()).optional(),
})



export function ProfileFormTraits({ users, samples, user }: { users: any, samples: any, user: any }) {
    const [files, setFiles] = useState<FileList | null>(null);
    const [selectedTypeFeatures, setSelectedTypeFeatures] = useState<LabelType>();
    const { traittypes, equipmenttypes } = useConfigTypes();
    // Memoize the options to avoid re-computation on each render
    const sampleOptions = useMemo(() => {
        return samples.map((sample: { _id: any; name: any }) => ({ value: sample._id, label: sample.name }));
    }, [samples]);

    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date(),
            responsible: getUserIdByName(user?.name, users),
        },
    })

    const { watch } = form;

    // Watch the 'type' field
    const selectedType = watch("type");
    
    // take the current object from traittypes, matching it using selectedType for traittype.value
    useEffect(() => {
        const selectedTypeFeatures = traittypes.find((traittype) => traittype.value === selectedType);
        setSelectedTypeFeatures(selectedTypeFeatures);
        form.setValue('unit', selectedTypeFeatures?.unit);
    }, [selectedType, form]);
        

    const getSampleNameById = (sampleId: string, samples: any[]) => {
        const sample = samples.find(s => s._id === sampleId);
        return sample ? sample.name : '';
    };

    const renameFiles = (files: FileList, sampleName: string): FileList => {
        const renamedFiles = Array.from(files).map(file => {
            const newName = `${sampleName}_${file.name}`;
            return new File([file], newName, { type: file.type });
        });

        // Create a FileList-like object
        const fileList = {
            ...renamedFiles,
            item: (index: number) => renamedFiles[index],
            length: renamedFiles.length,
            [Symbol.iterator]: function* () {
                yield* renamedFiles;
            },
        } as unknown as FileList;

        return fileList;
    };

    // 2. Define a submit handler.
    async function onSubmit(values: z.infer<typeof formSchema>) {
        const method = 'create';
        const endpoint = `${prepend_path}/api/traits`;
        console.log(values)

        // Get the dataType for the selected trait type
        const dataType = selectedTypeFeatures?.dataType || 'quantitative';

        // Initialize variables for quantitative traits
        let avg = 0.0;
        let std = 0.0;
        let listvals: number[] = [];

        // Process data based on trait type
        if (dataType === 'quantitative') {
            // if measurements is a list of measurement, do the following
            // 1. save the list formatted correctly inside listvals
            // 2. calculate the average of the list
            // 3. calculate the standard deviation of the list
            if (values.measurements) {
                // check what is the separator being used between the numbers between ',', ';' and space
                const separator = values.measurements.includes(',') ? ',' : values.measurements.includes(';') ? ';' : ' ';
                listvals = values.measurements.split(separator).map(Number);
                const sum = listvals.reduce((a, b) => a + b, 0);
                avg = sum / listvals.length;
                std = Math.sqrt(listvals.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / listvals.length);
            }
        }

        let fileResponse = null;
        if (files && files.length > 0) {
            const sampleName = getSampleNameById(values.sampleId, samples);
            const renamedFiles = renameFiles(files, sampleName);
            // Update to include entryType and entryId
            fileResponse = await uploadFiles(renamedFiles, values.type, { deferredLink: true, mediaType: 'image/jpeg' });
        }

        // Build request body based on data type
        const requestBody: any = {
            method: method,
            sampleId: values.sampleId,
            responsible: values.responsible,
            type: values.type,
            detail: values.detail,
            equipment: values.equipment,
            date: values.date,
            nfibres: values.nfibres,
            notes: values.notes,
            filesId: fileResponse,
            recentChangeDate: new Date().toISOString()
        };

        // Add appropriate fields based on data type
        if (dataType === 'quantitative') {
            requestBody.unit = values.unit;
            requestBody.measurement = avg;
            requestBody.std = std;
            requestBody.listvals = listvals;
        } else if (dataType === 'multiselect') {
            requestBody.categoricalValues = values.categoricalValues;
        } else {
            // categorical, boolean, ordinal
            requestBody.categoricalValue = values.categoricalValue;
        }

        const traitResponse = await fetch(endpoint, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });        if (!traitResponse.ok) {
            const error = await traitResponse.json();
            toast.error(error.error || 'Failed to submit');
            return;
        } else {
            const response = await traitResponse.json();
            
            // Mutate the correct SWR cache entries to update the UI
            mutate(`${prepend_path}/api/traits`);
            mutate(`${prepend_path}/api/traits?includeSampleFeatures=true`);
            
            toast.success(
                "Submitted!", {
                description: <code className="text-white">{JSON.stringify(values, null, 2)}</code>,
            })
            // for each file in fileResponse, link it to the trait
            if (fileResponse) {
                fileResponse.forEach(async (fileId: string | null) => {
                    if (fileId)
                        await linkFileToEntry(fileId, 'trait', response.id);
                });
            }
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Tabs defaultValue="general" className="w-auto">
                    <TabsList>
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="values">Values</TabsTrigger>
                    </TabsList>
                    <TabsContent value="general" className="space-y-4">
                        <ComboFormBox
                            control={form.control}
                            setValue={form.setValue}
                            name="type"
                            options={traittypes.map((type) => ({ value: type.value, label: type.label }))}
                            fieldlabel={"Trait type"}
                            description={""}
                        />
                        <ComboFormBox
                            control={form.control}
                            setValue={form.setValue}
                            name="equipment"
                            options={equipmenttypes.map((equipment) => ({ value: equipment.value, label: equipment.label }))}
                            fieldlabel={"Equipment"}
                            description={"Method or equipment used to measure the trait"}
                            others_enabled={true}
                        />
                    </TabsContent>
                    <TabsContent value="details" className="space-y-4">
                        <ComboFormBox
                            control={form.control}
                            setValue={form.setValue}
                            name="responsible"
                            options={users.map((user: { _id: any; name: any }) => ({ value: user._id, label: user.name }))}
                            fieldlabel={"User"}
                            description={"Responsible user for the sample"}
                        />
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date of collection</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-[240px] pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("1900-01-01")
                                                }
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>
                                        Date of measurement of the trait
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </TabsContent>
                    <TabsContent value="values">
                        <ComboFormBox
                            control={form.control}
                            setValue={form.setValue}
                            name="sampleId"
                            options={sampleOptions}
                            fieldlabel={"Sample"}
                            description={"Sample from which the trait is derived"}
                        />
                        <FormField
                            control={form.control}
                            name="detail"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Detail of the sample measured</FormLabel>
                                    <FormControl>
                                        <Input placeholder="all, specific part, etc" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {/* Conditional rendering based on trait dataType */}
                        {(!selectedTypeFeatures?.dataType || selectedTypeFeatures?.dataType === 'quantitative') && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="measurements"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{selectedTypeFeatures?.label} measurements</FormLabel>
                                            <FormControl>
                                                <Input placeholder="0.0" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Enter a single value or multiple values separated by commas, semicolons, or spaces
                                            </FormDescription>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="unit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{selectedTypeFeatures?.label} unit</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Please insert unit" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        {selectedTypeFeatures?.dataType === 'categorical' && (
                            <ComboFormBox
                                control={form.control}
                                setValue={form.setValue}
                                name="categoricalValue"
                                options={selectedTypeFeatures.options?.map((opt: string) => ({ value: opt, label: opt })) || []}
                                fieldlabel={selectedTypeFeatures.label}
                                description={"Select a category"}
                            />
                        )}

                        {selectedTypeFeatures?.dataType === 'boolean' && (
                            <FormField
                                control={form.control}
                                name="categoricalValue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{selectedTypeFeatures.label}</FormLabel>
                                        <FormControl>
                                            <select {...field} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors">
                                                <option value="">Select...</option>
                                                <option value="yes">Yes</option>
                                                <option value="no">No</option>
                                            </select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        )}

                        {selectedTypeFeatures?.dataType === 'ordinal' && (
                            <FormField
                                control={form.control}
                                name="categoricalValue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{selectedTypeFeatures.label}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={selectedTypeFeatures.min}
                                                max={selectedTypeFeatures.max}
                                                placeholder={`Enter a value between ${selectedTypeFeatures.min} and ${selectedTypeFeatures.max}`}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            {selectedTypeFeatures.description} (Range: {selectedTypeFeatures.min}-{selectedTypeFeatures.max})
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />
                        )}

                        {selectedTypeFeatures?.dataType === 'multiselect' && (
                            <FormField
                                control={form.control}
                                name="categoricalValues"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{selectedTypeFeatures.label}</FormLabel>
                                        <FormControl>
                                            <select
                                                multiple
                                                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                                                value={field.value || []}
                                                onChange={(e) => {
                                                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                                                    field.onChange(selected);
                                                }}
                                            >
                                                {selectedTypeFeatures.options?.map((opt: string) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </FormControl>
                                        <FormDescription>
                                            Hold Ctrl/Cmd to select multiple values
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />
                        )}
                    </TabsContent>
                </Tabs>
                <Button type="submit">Submit</Button>
            </form>
        </Form >
    )
}
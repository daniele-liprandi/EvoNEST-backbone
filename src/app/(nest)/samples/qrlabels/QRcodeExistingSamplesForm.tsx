"use client";

import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from '@/components/ui/checkbox';
import { SelectTrigger, SelectValue, SelectContent, SelectItem, Select } from '@/components/ui/select';

const qrCodeSchema = z.object({
    barcodeType: z.enum(['qr', 'code128']),
    format: z.string(), // Using string to allow different formats based on barcodeType
    size: z.coerce.number().min(10, { message: "Size must be at least 10mm" }).max(50, { message: "Size must be at most 50mm" }),
    date_start: z.any(),
    date_end: z.any(),
    type: z.enum(['all', 'animal', 'silk']).default('all'),
    status: z.enum(['all', 'alive', 'preserved']).default('all'),
});

type QrCodeFormValues = z.infer<typeof qrCodeSchema>;

interface QrCodeFormProps {
    onSubmit: (data: QrCodeFormValues) => void;
}

const QrCodeFormExisting: React.FC<QrCodeFormProps> = ({ onSubmit }) => {
    const form = useForm<QrCodeFormValues>({
        resolver: zodResolver(qrCodeSchema),
        defaultValues: {
            barcodeType: 'qr',
            format: 'custom',
            size: 30,
            date_start: new Date(),
            date_end: new Date(),
            type: 'animal',
            status: 'all',
        },
    });

    const handleSubmit = (data: QrCodeFormValues) => {
        console.log("Form submitted with data:", data);
        onSubmit(data);
    };

    const barcodeType = form.watch('barcodeType');
    const format = form.watch('format');


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="barcodeType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Barcode Type</FormLabel>
                            <Select onValueChange={(value) => {
                                field.onChange(value);
                                // Reset format when barcode type changes
                                form.setValue('format', value === 'qr' ? 'custom' : 'vial');
                            }} defaultValue={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select barcode type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="qr">QR Code</SelectItem>
                                    <SelectItem value="code128">Barcode (Code 128)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="format"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Label Format</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="custom">Custom Size</SelectItem>
                                    {barcodeType === 'qr' ? (
                                        <SelectItem value="slides">Silk slides (width = 13 mm)</SelectItem>
                                    ) : (
                                        <SelectItem value="vial">Vial (width = 35.6 mm)</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {format === 'custom' && (
                    <FormField
                        control={form.control}
                        name="size"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>QR Code Size (mm)</FormLabel>
                                <FormControl>
                                    <Input type="number" min="10" max="50" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Specify the size of the QR Code in millimeters.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <FormField
                    control={form.control}
                    name="date_start"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Starting Collection Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormDescription>
                                The collection date of the samples from which to start generating QR Codes.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="date_end"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ending Collection Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormDescription>
                                The collection date of the samples at which to stop generating QR Codes.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sample Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Samples</SelectItem>
                                    <SelectItem value="animal">Animals</SelectItem>
                                    <SelectItem value="silk">Silks</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Filter samples by their type.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sample Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Samples</SelectItem>
                                    <SelectItem value="alive">Alive</SelectItem>
                                    <SelectItem value="preserved">Preserved</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Filter samples by their current status.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit">Generate QR Codes</Button>
            </form>
        </Form>
    );
};

export default QrCodeFormExisting;
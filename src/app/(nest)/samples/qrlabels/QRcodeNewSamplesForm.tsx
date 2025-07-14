// src/app/utils/qrlabels/QrCodeForm.tsx
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
  size: z.coerce.number().min(10, { message: "Size must be at least 10mm" }).max(50, { message: "Size must be at most 50mm" }),
  prefix: z.string().min(1, { message: "Prefix is required" }),
  startNumber: z.coerce.number().min(1, { message: "Start number must be at least 1" }),
  numberofqrcodes: z.coerce.number().min(1, { message: "Number of QR Codes must be at least 1" }),
  fitToHerma: z.boolean(),
  barcodeType: z.enum(['qr', 'code128']),
  format: z.enum(['custom', 'herma']),
});

type QrCodeFormValues = z.infer<typeof qrCodeSchema>;

interface QrCodeFormProps {
  onSubmit: (data: QrCodeFormValues) => void;
}

const QrCodeFormNew: React.FC<QrCodeFormProps> = ({ onSubmit }) => {
  const form = useForm<QrCodeFormValues>({
    resolver: zodResolver(qrCodeSchema),
    defaultValues: {
      size: 30,
      prefix: 'QR_',
      startNumber: 1000001,
      numberofqrcodes: 1,
      fitToHerma: false,
    },
  });

  const handleSubmit = (data: QrCodeFormValues) => {
    onSubmit(data);
  };

  return (

    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="barcodeType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Barcode Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select barcode type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qr">QR Code</SelectItem>
                  <SelectItem value="code128">Code 128</SelectItem>
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
                  <SelectItem value="herma">HERMA (35.6 x 16.9 mm)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <FormField
          control={form.control}
          name="prefix"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prefix</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormDescription>
                This prefix will be added to the QR Code labels.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="startNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Number</FormLabel>
              <FormControl>
                <Input type="number" min="1" {...field} />
              </FormControl>
              <FormDescription>
                The number from which to start labeling the QR Codes.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="numberofqrcodes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of QR Codes</FormLabel>
              <FormControl>
                <Input type="number" min="1" {...field} />
              </FormControl>
              <FormDescription>
                Total number of QR Codes to generate.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* <FormField
          control={form.control}
          name="fitToHerma"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fit to HERMA Labels</FormLabel>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Fit the QR Codes to HERMA Price labels (35.6 x 16.9 mm).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        /> */}
        <Button type="submit">Generate QR Codes</Button>
      </form>
    </Form>
  );
};

export default QrCodeFormNew;

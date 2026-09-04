"use client" // Enables client-side rendering in Next.js

import { useMemo, useState } from 'react';
import { Table as TanstackTable } from '@tanstack/react-table';
import { Scanner } from '@yudiel/react-qr-scanner';

import { DataTable } from '@/components/tables/data-table';
import { DataTableToolbar } from '@/components/tables/data-table-toolbar';
import { useSampleData } from '@/hooks/useSampleData';
import { useUserData } from '@/hooks/useUserData';
import { tableSwrConfig } from '@/hooks/swrConfig';
import { prepend_path } from "@/lib/utils";
import { aliveColumns, deadColumns, positionColumns } from './columns.js';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
    handleBulkDeleteSamples,
    handleBulkUpdateSampleFields,
    handleDeleteSample,
    handleStatusChangeSample,
    handleStatusIncrementSample,
    handleUpdateSampleFields,
} from '@/utils/handlers/sampleHandlers.js';
import { sampleEditFields, sampleRegenerateOn } from '@/components/tables/edit-fields';
import { Button } from "@/components/ui/button"

const sampleHandlers = {
    onDelete: handleDeleteSample,
    onStatusChange: handleStatusChangeSample,
    onIncrement: handleStatusIncrementSample,
    onUpdateFields: handleUpdateSampleFields,
    onBulkDelete: handleBulkDeleteSamples,
    onBulkUpdateFields: handleBulkUpdateSampleFields,
    bulkEditFields: sampleEditFields,
    bulkRegenerateOn: sampleRegenerateOn,
    bulkEntityLabel: "sample" as const,
};

function byDateDesc(a: { date: string | number | Date }, b: { date: string | number | Date }) {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
}

export default function MaintenancePage() {
    const { samplesData, samplesError } = useSampleData(prepend_path, tableSwrConfig);
    const { usersData, usersError } = useUserData(prepend_path, tableSwrConfig);
    const [scanning, setScanning] = useState(false);
    const [scannedSamples, setScannedSamples] = useState<string[]>([]);

    const { position, alive, dead } = useMemo(() => {
        if (!samplesData || !usersData) {
            return { position: [], alive: [], dead: [] };
        }
        const sampleName = new Map<string, string>(samplesData.map((s: any) => [s._id, s.name]));
        const userName = new Map<string, string>(usersData.map((u: any) => [u._id, u.name]));
        const decorate = (sample: any) => ({
            ...sample,
            parentName: sampleName.get(sample.parentId) ?? '',
            responsibleName: userName.get(sample.responsible) ?? '',
        });
        const sorted = [...samplesData].sort(byDateDesc);
        return {
            position: sorted.map(decorate),
            alive: sorted.filter((s: any) => s.lifestatus === "alive").map(decorate),
            dead: sorted.filter((s: any) => s.lifestatus === "preserved").map(decorate),
        };
    }, [samplesData, usersData]);

    if (samplesError || usersError) {
        return <p className="p-6 text-sm text-destructive">Could not load samples.</p>;
    }

    if (!samplesData || !usersData) {
        return <Skeleton className="h-96 w-full rounded-xl" />;
    }

    // Scan several QRs and feed the animals: for each new id, increment "fed" by 1.
    const handleBarcodeScanned = (results: any[]) => {
        if (!results || results.length === 0) return;
        const qrData = results[0].rawValue;
        const compressedId = qrData.split('?')[0];
        const isHex = /^[0-9a-f]{24}$/i.test(compressedId);
        const id = isHex
            ? compressedId
            : Buffer.from(compressedId.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('hex');
        if (!id || scannedSamples.includes(id)) return;
        setScannedSamples((prev) => [...prev, id]);
        handleStatusIncrementSample(id, "fed", true);
    };

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Feed animals via QR</CardTitle>
                    <CardDescription>Scan an animal&apos;s label to record a feeding.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button variant="outline" size="sm" onClick={() => setScanning(true)}>
                        Scan QR
                    </Button>
                    {scannedSamples.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                            Fed {scannedSamples.length} animal{scannedSamples.length === 1 ? "" : "s"} this session.
                        </p>
                    )}
                    {scanning && (
                        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 p-4">
                            <div className="w-full max-w-md">
                                <Scanner
                                    onScan={handleBarcodeScanned}
                                    formats={['code_128', 'qr_code']}
                                    components={{ zoom: true }}
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setScanning(false)}
                                className="absolute right-4 top-4"
                            >
                                Close
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Accordion type="single" collapsible>
                <AccordionItem value="alive">
                    <AccordionTrigger>Alive animals</AccordionTrigger>
                    <AccordionContent>
                        <DataTable
                            {...sampleHandlers}
                            tableId="alive"
                            columns={aliveColumns}
                            data={alive}
                            renderToolbar={(table: TanstackTable<any>) => (
                                <DataTableToolbar table={table} entity="samples_alive" />
                            )}
                        />
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="dead">
                    <AccordionTrigger>Preserved animals</AccordionTrigger>
                    <AccordionContent>
                        <DataTable
                            {...sampleHandlers}
                            tableId="preserved"
                            columns={deadColumns}
                            data={dead}
                            renderToolbar={(table: TanstackTable<any>) => (
                                <DataTableToolbar table={table} entity="samples_preserved" />
                            )}
                        />
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="position">
                    <AccordionTrigger>Position</AccordionTrigger>
                    <AccordionContent>
                        <DataTable
                            {...sampleHandlers}
                            tableId="position"
                            columns={positionColumns}
                            data={position}
                            renderToolbar={(table: TanstackTable<any>) => (
                                <DataTableToolbar table={table} entity="samples_position" />
                            )}
                        />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}

"use client" // Enables client-side rendering in Next.js

import { DataTable } from '@/components/tables/data-table.js';
import { getSampleNamebyId } from '@/hooks/sampleHooks.js';
import { getUserIdByName, getUserNameById } from "@/hooks/userHooks.js";
import { useSampleData } from '@/hooks/useSampleData';
import { useUserData } from '@/hooks/useUserData';
import { prepend_path } from "@/lib/utils";
import { SetStateAction, useState, } from 'react';
import { aliveColumns, deadColumns, positionColumns } from './columns.js';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { handleDeleteSample, handleEditSample, handleStatusChangeSample, handleStatusIncrementSample } from '@/utils/handlers/sampleHandlers.js';
import { Button } from "@/components/ui/button"
import { Scanner } from '@yudiel/react-qr-scanner';

export default function MaintenancePage() {
    const { samplesData, samplesError } = useSampleData(prepend_path);
    const { usersData, usersError } = useUserData(prepend_path);
    const [scanning, setScanning] = useState(false);
    // array of strings
    const [scannedSamples, setScannedSamples] = useState<string[]>([]);

    if (!samplesData) return (
        <div className="flex flex-col space-y-3">
            <Skeleton className="h-[500px] w-[1000px] rounded-xl" />
        </div>
    );
    if (samplesError) return <div>Error loading data</div>;
    if (!usersData) return (
        <Skeleton className="h-[500px] w-[1000px] rounded-xl" />
    );
    if (usersError) return <div>Error loading data</div>;

    const positionTableData = samplesData.sort((a: { date: string | number | Date; }, b: { date: string | number | Date; }) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const alivedataTableData = samplesData.sort((a: { date: string | number | Date; }, b: { date: string | number | Date; }) => new Date(b.date).getTime() - new Date(a.date).getTime()).filter((sample: { lifestatus: string; }) => sample.lifestatus === "alive").
        map((sample: { parentId: any; responsible: any; }) => ({
            ...sample,
            parentName: getSampleNamebyId(sample.parentId, samplesData),
            responsibleName: getUserNameById(sample.responsible, usersData)
        }));

    const deaddataTableData = samplesData.sort((a: { date: string | number | Date; }, b: { date: string | number | Date; }) => new Date(b.date).getTime() - new Date(a.date).getTime()).filter((sample: { lifestatus: string; }) => sample.lifestatus === "preserved").
        map((sample: { parentId: any; responsible: any; }) => ({
            ...sample,
            parentName: getSampleNamebyId(sample.parentId, samplesData),
            responsibleName: getUserNameById(sample.responsible, usersData)
        }));


    const feedSample = (sampleId: string) => {
        handleStatusIncrementSample(sampleId, "fed", true)
    }

    // Scan several QRs and feed the animals by sending a fetch POST to /samples and increment field "fed" by 1
    const handleBarcodeScanned = (results: any[]) => {
        if (results && results.length > 0) {
            const qrData = results[0].rawValue;
            const compressedId = qrData.split('?')[0];
            // Check if the scanned data is a valid hex string
            const isHex = /^[0-9a-f]{24}$/i.test(compressedId);
            // If it is a valid hex string, use it as is, otherwise convert it from base64url to hex
            const id = isHex ? compressedId : Buffer.from(
                compressedId
                    .replace(/-/g, '+')  // Convert - back to +
                    .replace(/_/g, '/'), // Convert _ back to /
                'base64'
            ).toString('hex');
            setScannedSamples([...scannedSamples, id]);
            if (id) {
                if (scannedSamples.includes(id)) { } else {
                    feedSample(id);
                }
            }
        }
    };

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Feed animals via QR</CardTitle>
                    <CardDescription>
                        Scan animals to feed them
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div></div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setScanning(true)}
                    >
                        Scan QR
                    </Button>
                    {scanning && (
                        <div className="sm:fixed md:absolute sm:inset-0 md:w-500 md:h-500 bg-white z-50 flex flex-col items-center justify-center">
                            <Scanner
                                onScan={handleBarcodeScanned}
                                formats={['code_128', 'qr_code']}
                                components={{ zoom: true }}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setScanning(false)}
                                className="absolute top-4 right-4"
                            >
                                Close
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                    <AccordionTrigger>Alive animals</AccordionTrigger>
                    <AccordionContent>
                        <Card className="xl:col-span-2">
                            <CardHeader className="flex flex-row items-center">
                                <div className="grid gap-2">
                                    <CardTitle>Alive maintenance</CardTitle>
                                    <CardDescription>
                                        Maintain your alive animals
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <DataTable columns={aliveColumns} data={alivedataTableData} onDelete={handleDeleteSample} onEdit={handleEditSample} onStatusChange={handleStatusChangeSample} onIncrement={handleStatusIncrementSample}
                                ></DataTable>
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>Dead animals</AccordionTrigger>
                    <AccordionContent>
                        <Card className="xl:col-span-2">
                            <CardHeader className="flex flex-row items-center">
                                <div className="grid gap-2">
                                    <CardTitle>Dead maintenance</CardTitle>
                                    <CardDescription>
                                        Keep your dead bodies safe
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <DataTable columns={deadColumns} data={deaddataTableData} onDelete={handleDeleteSample} onEdit={handleEditSample} onStatusChange={handleStatusChangeSample} onIncrement={handleStatusIncrementSample}
                                ></DataTable>
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                    <AccordionTrigger>Position</AccordionTrigger>
                    <AccordionContent>
                        <Card className="xl:col-span-2">
                            <CardHeader className="flex flex-row items-center">
                                <div className="grid gap-2">
                                    <CardTitle>Position</CardTitle>
                                    <CardDescription>
                                        Check your maps
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <DataTable columns={positionColumns} data={positionTableData} onDelete={handleDeleteSample} onEdit={handleEditSample} onStatusChange={handleStatusChangeSample} onIncrement={handleStatusIncrementSample}
                                ></DataTable>
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>

    );
}
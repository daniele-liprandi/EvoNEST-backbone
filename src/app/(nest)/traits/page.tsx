"use client" // Enables client-side rendering in Next.js

import { DataTable } from '@/components/tables/data-table';
import { getParentIdbyId, getSampleNamebyId, getSampleSubtypebyId, getSampletypebyId } from '@/hooks/sampleHooks';
import { getUserIdByName, getUserNameById } from "@/hooks/userHooks";
import { useSampleData } from '@/hooks/useSampleData';
import { useUserData } from '@/hooks/useUserData';
import { prepend_path } from "@/lib/utils";
import { useMemo } from 'react';
import { SetStateAction, useState, } from 'react';
import { mutate } from "swr";
import { baseColumns } from './columns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { handleDeleteTrait, handleStatusChangeTrait, handleStatusIncrementTrait, handleExportAllTraitsRelated, handleConvertAllUnits, previewUnitConversion } from '@/utils/handlers/traitHandlers';
import { SmartVaul } from '@/components/forms/smart-vaul';
import { useTraitData } from '@/hooks/useTraitData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeftRight } from 'lucide-react';
import { ReloadIcon } from "@radix-ui/react-icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function TraitsPage() {
    const [showConversionDialog, setShowConversionDialog] = useState(false);
    const [conversionPreview, setConversionPreview] = useState<any>(null);
    const [isConverting, setIsConverting] = useState(false);
    
    // Add debugging to SWR config
    const { traitsData, traitsError, isValidating: traitsValidating } = useTraitData(prepend_path, true, undefined, {
        revalidateIfStale: false,
        revalidateOnFocus: false,
        keepPreviousData: true,
        dedupingInterval: 3600000, // Cache for 1 hour
        onSuccess: (data : any) => console.log('Traits loaded, size:', data?.length)
    });

    const { samplesData, samplesError, isValidating: samplesValidating } = useSampleData(prepend_path, {
        revalidateIfStale: false,
        revalidateOnFocus: false,
        keepPreviousData: true,
        dedupingInterval: 3600000,
    });

    const { usersData, usersError } = useUserData(prepend_path, {
        revalidateIfStale: false,
        revalidateOnFocus: false,
        dedupingInterval: 3600000,
    });

    // Create lookup maps for better performance
    const sampleLookup = useMemo(() => {
        if (!samplesData) return new Map();
        return new Map(samplesData.map((sample: { _id: any; }) => [sample._id, sample]));
    }, [samplesData]);

    const userLookup = useMemo(() => {
        if (!usersData) return new Map();
        return new Map(usersData.map((user: { _id: any; }) => [user._id, user]));
    }, [usersData]);

    // Show loading states
    const isLoading = !traitsData || !samplesData || !usersData;
    const isError = traitsError || samplesError || usersError;
    const isValidating = traitsValidating || samplesValidating;

    if (isError) {
        return <div>Error loading data</div>;
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Skeleton className="w-64 h-8 mb-4" />
                <Skeleton className="w-full h-48 mb-4" />
                <Skeleton className="w-full h-48 mb-4" />
                <Skeleton className="w-full h-48 mb-4" />
            </div>
        );
    }

    const dataTableData = traitsData.sort((a: { date: string | number | Date; }, b: { date: string | number | Date; }) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((trait: { sampleId: any; responsible: any; }) => (
            {
                ...trait,
                sampleName: getSampleNamebyId(trait.sampleId, samplesData),
                responsibleName: getUserNameById(trait.responsible, usersData),
                sampleType: getSampletypebyId(trait.sampleId, samplesData),
                sampleSubType: getSampleSubtypebyId(trait.sampleId, samplesData),
                animalId: getParentIdbyId(trait.sampleId, samplesData) || trait.sampleId,
                animalName: getSampleNamebyId(getParentIdbyId(trait.sampleId, samplesData) || trait.sampleId, samplesData),
            }));

    const handleConversionClick = async () => {
        try {
            const preview = await previewUnitConversion();
            setConversionPreview(preview);
            setShowConversionDialog(true);
        } catch (error) {
            // Error already handled in previewUnitConversion
        }
    };

    const handleConfirmConversion = async () => {
        setIsConverting(true);
        try {
            await handleConvertAllUnits();
            setShowConversionDialog(false);
        } catch (error) {
            // Error already handled in handleConvertAllUnits
        } finally {
            setIsConverting(false);
        }
    };

    return (
        <div>
            <Card className="xl:col-span-2">
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>Traits</CardTitle>
                        <CardDescription>
                            The collection of traits in the NEST
                            {isValidating && " (Refreshing...)"}
                        </CardDescription>
                    </div>
                    <div className="ml-auto flex gap-2 items-center">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1"
                            onClick={handleConversionClick}
                            title="Convert all traits to their default units using SI prefix conversion"
                        >
                            <ArrowLeftRight className="h-4 w-4" />
                            Convert to Default Units
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="gap-1"
                                >
                                    <Download className="h-4 w-4" />
                                    Export (with related)
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleExportAllTraitsRelated('json')}>
                                    JSON
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExportAllTraitsRelated('csv')}>
                                    CSV (flattened)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <SmartVaul 
                            formType='traits' 
                            users={usersData} 
                            samples={samplesData} 
                            traits={traitsData} 
                            size="sm" 
                            className="gap-1" 
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable 
                        columns={baseColumns} 
                        data={dataTableData} 
                        onDelete={handleDeleteTrait} 
                        onEdit={null} 
                        onStatusChange={handleStatusChangeTrait} 
                        onIncrement={handleStatusIncrementTrait}
                    />
                </CardContent>
            </Card>

            {/* Unit Conversion Confirmation Dialog */}
            <AlertDialog open={showConversionDialog} onOpenChange={setShowConversionDialog}>
                <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Unit Conversion</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <p>
                                    This will convert trait measurements to their default units based on SI prefix conversion.
                                </p>

                                {conversionPreview && (
                                    <>
                                        <div className="border rounded-lg p-4 bg-muted/50">
                                            <p className="font-medium mb-2">Summary</p>
                                            <div className="space-y-1 text-sm">
                                                <p>Total traits: {conversionPreview.totalTraits}</p>
                                                <p>Will be converted: {conversionPreview.willConvert}</p>
                                                <p>Will be skipped: {conversionPreview.willSkip}</p>
                                            </div>
                                        </div>

                                        {conversionPreview.preview.length > 0 && (
                                            <div className="border rounded-lg p-2">
                                                <p className="font-medium mb-2">Preview (first 10 conversions)</p>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Trait Type</TableHead>
                                                            <TableHead>Current Value</TableHead>
                                                            <TableHead>New Value</TableHead>
                                                            <TableHead>Date</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {conversionPreview.preview.map((item: any, i: number) => (
                                                            <TableRow key={i}>
                                                                <TableCell className="capitalize">{item.type}</TableCell>
                                                                <TableCell>
                                                                    {item.oldValue.toFixed(3)} {item.oldUnit}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {item.newValue.toFixed(3)} {item.newUnit}
                                                                </TableCell>
                                                                <TableCell className="text-sm text-muted-foreground">
                                                                    {new Date(item.date).toLocaleDateString()}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                                {conversionPreview.willConvert > 10 && (
                                                    <p className="text-sm text-muted-foreground mt-2">
                                                        ... and {conversionPreview.willConvert - 10} more conversions
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {conversionPreview.willConvert === 0 && (
                                            <div className="border rounded-lg p-4 bg-muted/50">
                                                <p className="text-sm">
                                                    No traits need conversion. All traits are already in their default units or have incompatible units.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isConverting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmConversion}
                            disabled={isConverting || !conversionPreview || conversionPreview.willConvert === 0}
                        >
                            {isConverting ? (
                                <>
                                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                                    Converting...
                                </>
                            ) : (
                                'Confirm Conversion'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
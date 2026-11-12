"use client" // Enables client-side rendering in Next.js

import { Suspense, useMemo, useState } from 'react';
import { ArrowsLeftRight, CircleNotch } from '@phosphor-icons/react';
import type { Table as TanstackTable } from '@tanstack/react-table';

import { DataTable } from '@/components/tables/data-table';
import { DataTableToolbar } from '@/components/tables/data-table-toolbar';
import { Button } from '@/components/ui/button';
import { useSampleData } from '@/hooks/useSampleData';
import { useUserData } from '@/hooks/useUserData';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { tableSwrConfig } from '@/hooks/swrConfig';
import { prepend_path } from "@/lib/utils";
import { baseColumns } from './columns';
import { Skeleton } from '@/components/ui/skeleton';
import { handleBulkDeleteTraits, handleBulkUpdateTraitFields, handleDeleteTrait, handleStatusChangeTrait, handleStatusIncrementTrait, handleExportAllTraitsRelated, handleConvertAllUnits, previewUnitConversion, handleUpdateTraitFields } from '@/utils/handlers/traitHandlers';
import { traitEditFields } from '@/components/tables/edit-fields';
import { SmartVaul } from '@/components/forms/smart-vaul';
import { useTraitData } from '@/hooks/useTraitData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

function TraitsPageContent() {
    const { filterData } = useUrlFilters();
    const [showConversionDialog, setShowConversionDialog] = useState(false);
    const [conversionPreview, setConversionPreview] = useState<any>(null);
    const [isConverting, setIsConverting] = useState(false);

    const { traitsData, traitsError, isValidating: traitsValidating } = useTraitData(prepend_path, true, undefined, tableSwrConfig);
    const { samplesData, samplesError, isValidating: samplesValidating } = useSampleData(prepend_path, tableSwrConfig);
    const { usersData, usersError } = useUserData(prepend_path, tableSwrConfig);

    // Index samples and users by id once, so the per-trait lookups below are O(1)
    // instead of a linear scan of every sample for every trait.
    const sampleById = useMemo(
        () => new Map<string, any>((samplesData ?? []).map((sample: any) => [sample._id, sample])),
        [samplesData],
    );
    const userById = useMemo(
        () => new Map<string, any>((usersData ?? []).map((user: any) => [user._id, user])),
        [usersData],
    );

    const dataTableData = useMemo(() => {
        if (!traitsData || !samplesData || !usersData) {
            return [];
        }

        const sortedTraits = [...traitsData].sort(
            (a: { date: string | number | Date }, b: { date: string | number | Date }) =>
                new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        return filterData(
            sortedTraits.map((trait: { sampleId: any; responsible: any }) => {
                const sample = sampleById.get(trait.sampleId);
                const animalId = sample?.parentId || trait.sampleId;
                return {
                    ...trait,
                    sampleName: sample?.name ?? '',
                    responsibleName: userById.get(trait.responsible)?.name ?? '',
                    sampleType: sample?.type ?? '',
                    sampleSubType: sample?.subsampletype ?? '',
                    animalId,
                    animalName: sampleById.get(animalId)?.name ?? '',
                };
            }),
        );
    }, [traitsData, samplesData, usersData, filterData, sampleById, userById]);

    // Show loading states
    const isLoading = !traitsData || !samplesData || !usersData;
    const isError = traitsError || samplesError || usersError;
    const isValidating = traitsValidating || samplesValidating;

    if (isError) {
        return <p className="p-6 text-sm text-destructive">Could not load traits.</p>;
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 w-full rounded-xl" />
            </div>
        );
    }

    const handleConversionClick = async () => {
        const preview = await previewUnitConversion();
        setConversionPreview(preview);
        setShowConversionDialog(true);
    };

    const handleConfirmConversion = async () => {
        setIsConverting(true);
        try {
            await handleConvertAllUnits();
            setShowConversionDialog(false);
        } finally {
            setIsConverting(false);
        }
    };

    const actions = (
        <>
            <Button variant="outline" size="sm" onClick={handleConversionClick}>
                <ArrowsLeftRight /> Convert units
            </Button>
            <SmartVaul formType="traits" users={usersData} samples={samplesData} traits={traitsData} size="sm" />
        </>
    );

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Traits</CardTitle>
                    <CardDescription>
                        Every trait in the NEST{isValidating && ", refreshing"}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={baseColumns}
                        data={dataTableData}
                        onDelete={handleDeleteTrait}
                        onEdit={null}
                        onStatusChange={handleStatusChangeTrait}
                        onIncrement={handleStatusIncrementTrait}
                        onUpdateFields={handleUpdateTraitFields}
                        onBulkDelete={handleBulkDeleteTraits}
                        onBulkUpdateFields={handleBulkUpdateTraitFields}
                        bulkEditFields={traitEditFields}
                        bulkEntityLabel="trait"
                        renderToolbar={(table: TanstackTable<any>) => (
                            <DataTableToolbar
                                table={table}
                                entity="traits"
                                onExportRelated={handleExportAllTraitsRelated}
                            >
                                {actions}
                            </DataTableToolbar>
                        )}
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
                                                            <TableHead>Quantity</TableHead>
                                                            <TableHead>Current Value</TableHead>
                                                            <TableHead>New Value</TableHead>
                                                            <TableHead>Date</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {conversionPreview.preview.map((item: any, i: number) => (
                                                            <TableRow key={i}>
                                                                <TableCell className="capitalize">{item.quantity}</TableCell>
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
                                    <CircleNotch className="mr-2 size-4 animate-spin" />
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

export default function TraitsPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <TraitsPageContent />
        </Suspense>
    );
}
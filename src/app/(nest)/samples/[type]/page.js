// pages/[type].js

"use client" // Enables client-side rendering in Next.js

import { Suspense, useMemo } from 'react';
import { usePathname } from 'next/navigation'
import { useSampleData } from '@/hooks/useSampleData';
import { useUserData } from '@/hooks/useUserData';
import { DataTable } from '@/components/tables/data-table';
import { DataTableToolbar } from '@/components/tables/data-table-toolbar';
import { prepend_path } from "@/lib/utils";
import { Skeleton } from '@/components/ui/skeleton';
import { buildSampleColumns } from '../columns';
import { getSampleNamebyId } from '@/hooks/sampleHooks';
import { useConfigTypes } from '@/hooks/useConfigTypes';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { getUserNameById } from "@/hooks/userHooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SmartVaul } from '@/components/forms/smart-vaul';
import { handleBulkDeleteSamples, handleBulkUpdateSampleFields, handleDeleteSample, handleEditSample, handleStatusChangeSample, handleStatusIncrementSample, handleExportAllSamplesRelated, handleUpdateSampleFields } from '@/utils/handlers/sampleHandlers';
import { sampleEditFields } from '@/components/tables/edit-fields';

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function TypePageContent() {
    const pathname = usePathname();
    const type = pathname.split('/').pop();
    const typeLabel = capitalizeFirstLetter(type);
    const { filterData } = useUrlFilters();
    const { samplesData, samplesError } = useSampleData(prepend_path);
    const { usersData, usersError } = useUserData(prepend_path);
    const { sampletypes } = useConfigTypes();

    const columns = useMemo(() => {
        const typeConfig = sampletypes.find((t) => t.value === type);
        return buildSampleColumns({ type, husbandry: Boolean(typeConfig?.husbandry) });
    }, [sampletypes, type]);

    // Use useMemo for filtered data to prevent unnecessary recalculations
    const filteredData = useMemo(() => {
        if (!samplesData) return [];
        return samplesData
            .filter((sample) => sample.type === type)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [samplesData, type]);

    // Use useMemo for transformed data
    const dataTableData = useMemo(() => {
        if (!samplesData || !usersData) return [];
        return filterData(
            filteredData.map(sample => ({
                ...sample,
                parentName: getSampleNamebyId(sample.parentId, samplesData),
                responsibleName: getUserNameById(sample.responsible, usersData)
            }))
        );
    }, [filteredData, samplesData, usersData, filterData]);

    if (samplesError || usersError) {
        return <p className="p-6 text-sm text-destructive">Could not load samples.</p>;
    }

    if (!samplesData || !usersData) {
        return <Skeleton className="h-96 w-full rounded-xl" />;
    }

    const newButton = (
        <SmartVaul formType="samples" users={usersData} samples={samplesData} page={type || ""} size="sm" />
    );

    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <div className="grid gap-1">
                    <CardTitle>{typeLabel}</CardTitle>
                    <CardDescription>Your {typeLabel.toLowerCase()} samples.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                {filteredData.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                        <p className="text-sm text-muted-foreground">No samples of this type yet.</p>
                        {newButton}
                    </div>
                ) : (
                    <DataTable
                        onStatusChange={handleStatusChangeSample}
                        onDelete={handleDeleteSample}
                        onEdit={handleEditSample}
                        onIncrement={handleStatusIncrementSample}
                        onUpdateFields={handleUpdateSampleFields}
                        onBulkDelete={handleBulkDeleteSamples}
                        onBulkUpdateFields={handleBulkUpdateSampleFields}
                        bulkEditFields={sampleEditFields}
                        bulkEntityLabel="sample"
                        columns={columns}
                        data={dataTableData}
                        renderToolbar={(table) => (
                            <DataTableToolbar
                                table={table}
                                entity="samples"
                                onExportRelated={handleExportAllSamplesRelated}
                            >
                                {newButton}
                            </DataTableToolbar>
                        )}
                    />
                )}
            </CardContent>
        </Card>
    );
}

export default function TypePage() {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <TypePageContent />
        </Suspense>
    );
}
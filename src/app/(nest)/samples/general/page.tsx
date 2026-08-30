"use client" // Enables client-side rendering in Next.js

import { Suspense, useMemo } from 'react';
import { Table as TanstackTable } from '@tanstack/react-table';

import { DataTable } from '@/components/tables/data-table';
import { DataTableToolbar } from '@/components/tables/data-table-toolbar';
import { SmartVaul } from '@/components/forms/smart-vaul';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getSampleNamebyId } from '@/hooks/sampleHooks';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { getUserNameById } from "@/hooks/userHooks";
import { useSampleData } from '@/hooks/useSampleData';
import { useUserData } from '@/hooks/useUserData';
import { prepend_path } from "@/lib/utils";
import { handleBulkDeleteSamples, handleBulkUpdateSampleFields, handleDeleteSample, handleEditSample, handleStatusChangeSample, handleStatusIncrementSample, handleExportAllSamplesRelated, handleUpdateSampleFields } from '@/utils/handlers/sampleHandlers';
import { sampleEditFields } from '@/components/tables/edit-fields';
import { baseColumns } from '../columns';

function SamplesPageContent() {
    const { filterData } = useUrlFilters();

    const { samplesData, samplesError } = useSampleData(prepend_path, {
        revalidateIfStale: false,
        revalidateOnFocus: false,
        keepPreviousData: true,
    });
    const { usersData, usersError } = useUserData(prepend_path);

    const dataTableData = useMemo(() => {
        if (!samplesData || !usersData) return [];

        const sorted = [...samplesData].sort(
            (a: { date: string | number | Date }, b: { date: string | number | Date }) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return filterData(
            sorted.map((sample: { parentId: any; responsible: any }) => ({
                ...sample,
                parentName: getSampleNamebyId(sample.parentId, samplesData),
                responsibleName: getUserNameById(sample.responsible, usersData),
            }))
        );
    }, [samplesData, usersData, filterData]);

    if (samplesError || usersError) {
        return <p className="p-6 text-sm text-destructive">Could not load samples.</p>;
    }

    if (!samplesData || !usersData) {
        return <Skeleton className="h-96 w-full rounded-xl" />;
    }

    const newButton = (
        <SmartVaul formType="samples" users={usersData} samples={samplesData} page="general" size="sm" />
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Samples</CardTitle>
                <CardDescription>Every sample in the NEST.</CardDescription>
            </CardHeader>
            <CardContent>
                <DataTable
                    columns={baseColumns}
                    data={dataTableData}
                    onDelete={handleDeleteSample}
                    onEdit={handleEditSample}
                    onStatusChange={handleStatusChangeSample}
                    onIncrement={handleStatusIncrementSample}
                    onUpdateFields={handleUpdateSampleFields}
                    onBulkDelete={handleBulkDeleteSamples}
                    onBulkUpdateFields={handleBulkUpdateSampleFields}
                    bulkEditFields={sampleEditFields}
                    bulkEntityLabel="sample"
                    renderToolbar={(table: TanstackTable<any>) => (
                        <DataTableToolbar table={table} entity="samples" onExportRelated={handleExportAllSamplesRelated}>
                            {newButton}
                        </DataTableToolbar>
                    )}
                />
            </CardContent>
        </Card>
    );
}

export default function SamplesPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <SamplesPageContent />
        </Suspense>
    );
}

"use client" // Enables client-side rendering in Next.js

import { Suspense, useMemo } from 'react';
import { Table as TanstackTable } from '@tanstack/react-table';

import { DataTable } from '@/components/tables/data-table';
import { DataTableToolbar } from '@/components/tables/data-table-toolbar';
import { SmartVaul } from '@/components/forms/smart-vaul';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useSampleData } from '@/hooks/useSampleData';
import { useUserData } from '@/hooks/useUserData';
import { tableSwrConfig } from '@/hooks/swrConfig';
import { prepend_path } from "@/lib/utils";
import { handleBulkDeleteSamples, handleBulkUpdateSampleFields, handleDeleteSample, handleEditSample, handleStatusChangeSample, handleStatusIncrementSample, handleExportAllSamplesRelated, handleUpdateSampleFields } from '@/utils/handlers/sampleHandlers';
import { sampleEditFields, sampleRegenerateOn } from '@/components/tables/edit-fields';
import { baseColumns } from '../columns';

function SamplesPageContent() {
    const { filterData } = useUrlFilters();

    const { samplesData, samplesError } = useSampleData(prepend_path, tableSwrConfig);
    const { usersData, usersError } = useUserData(prepend_path, tableSwrConfig);

    const dataTableData = useMemo(() => {
        if (!samplesData || !usersData) return [];

        const sampleName = new Map<string, string>(samplesData.map((s: any) => [s._id, s.name]));
        const userName = new Map<string, string>(usersData.map((u: any) => [u._id, u.name]));

        const sorted = [...samplesData].sort(
            (a: { date: string | number | Date }, b: { date: string | number | Date }) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return filterData(
            sorted.map((sample: { parentId: any; responsible: any }) => ({
                ...sample,
                parentName: sampleName.get(sample.parentId) ?? '',
                responsibleName: userName.get(sample.responsible) ?? '',
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
                    bulkRegenerateOn={sampleRegenerateOn}
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

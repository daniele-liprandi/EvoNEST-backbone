"use client" // Enables client-side rendering in Next.js

import { DataTable } from '@/components/tables/data-table';
import { SmartVaul } from '@/components/forms/smart-vaul';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getSampleNamebyId } from '@/hooks/sampleHooks';
import { getUserNameById } from "@/hooks/userHooks";
import { useSampleData } from '@/hooks/useSampleData';
import { useUserData } from '@/hooks/useUserData';
import { prepend_path } from "@/lib/utils";
import { handleDeleteSample, handleEditSample, handleStatusChangeSample, handleStatusIncrementSample } from '@/utils/handlers/sampleHandlers';
import { baseColumns } from '../columns';

export default function SamplesPage() {

    const { samplesData, samplesError } = useSampleData(prepend_path, {
        revalidateIfStale: false, // Don't revalidate on mount if we have data
        revalidateOnFocus: false, // Don't revalidate on window focus
        keepPreviousData: true, // Keep showing previous data while loading
    });
    const { usersData, usersError } = useUserData(prepend_path);

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

    const dataTableData = samplesData.sort((a: { date: string | number | Date; }, b: { date: string | number | Date; }) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((sample: { parentId: any; responsible: any; }) => ({
            ...sample,
            parentName: getSampleNamebyId(sample.parentId, samplesData),
            responsibleName: getUserNameById(sample.responsible, usersData)
        }));

    return (
        <div>
            <Card className="xl:col-span-2">
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>Samples</CardTitle>
                        <CardDescription>
                            The collection of samples in the NEST
                        </CardDescription>
                    </div>
                    <SmartVaul formType="samples" users={usersData} samples={samplesData} page="general" size="sm" className="ml-auto gap-1" />
                </CardHeader>
                <CardContent>
                    <DataTable columns={baseColumns} data={dataTableData} onDelete={handleDeleteSample} onEdit={handleEditSample} onStatusChange={handleStatusChangeSample} onIncrement={handleStatusIncrementSample}
                    ></DataTable>
                </CardContent>
            </Card>
        </div>

    );
}
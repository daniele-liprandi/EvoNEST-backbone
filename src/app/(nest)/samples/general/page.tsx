"use client" // Enables client-side rendering in Next.js

import Link from 'next/link';
import { Suspense, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

import { NlFilterBar } from '@/components/nest/NlFilterBar';
import { DataTable } from '@/components/tables/data-table';
import { SmartVaul } from '@/components/forms/smart-vaul';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getSampleNamebyId } from '@/hooks/sampleHooks';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { getUserNameById } from "@/hooks/userHooks";
import { useSampleData } from '@/hooks/useSampleData';
import { useUserData } from '@/hooks/useUserData';
import { prepend_path } from "@/lib/utils";
import { handleDeleteSample, handleEditSample, handleStatusChangeSample, handleStatusIncrementSample } from '@/utils/handlers/sampleHandlers';
import { baseColumns } from '../columns';

function SamplesPageContent() {
    const pathname = usePathname();
    const { filters, filterData, hasFilters, buildUrlWithoutFilter } = useUrlFilters();

    const { samplesData, samplesError } = useSampleData(prepend_path, {
        revalidateIfStale: false, // Don't revalidate on mount if we have data
        revalidateOnFocus: false, // Don't revalidate on window focus
        keepPreviousData: true, // Keep showing previous data while loading
    });
    const { usersData, usersError } = useUserData(prepend_path);

    const dataTableData = useMemo(() => {
        if (!samplesData || !usersData) return [];

        const sorted = [...samplesData].sort((a: { date: string | number | Date; }, b: { date: string | number | Date; }) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return filterData(
            sorted.map((sample: { parentId: any; responsible: any; }) => ({
                ...sample,
                parentName: getSampleNamebyId(sample.parentId, samplesData),
                responsibleName: getUserNameById(sample.responsible, usersData),
            }))
        );
    }, [samplesData, usersData, filterData]);

    const filterColumns = useMemo(
        () => (dataTableData.length ? Object.keys(dataTableData[0]) : []),
        [dataTableData]
    );

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
                    <NlFilterBar columns={filterColumns} />

                    {hasFilters && (
                        <div className="flex flex-wrap gap-2 items-center mb-3 text-sm">
                            <span className="text-muted-foreground">Filtered by:</span>
                            {filters.map(({ key, values }) => (
                                <Badge key={key} variant="secondary" className="gap-1 pr-1">
                                    {key}: {values.join(', ')}
                                    <Link href={buildUrlWithoutFilter(key, pathname)}>
                                        <X className="h-3 w-3 cursor-pointer" />
                                    </Link>
                                </Badge>
                            ))}
                            <Link href={pathname}>
                                <Button variant="ghost" size="sm" className="h-6 text-xs">Clear all</Button>
                            </Link>
                        </div>
                    )}

                    <DataTable columns={baseColumns} data={dataTableData} onDelete={handleDeleteSample} onEdit={handleEditSample} onStatusChange={handleStatusChangeSample} onIncrement={handleStatusIncrementSample}
                    ></DataTable>
                </CardContent>
            </Card>
        </div>

    );
}

export default function SamplesPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[500px] w-[1000px] rounded-xl" />}>
            <SamplesPageContent />
        </Suspense>
    );
}
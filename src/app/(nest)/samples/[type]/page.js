// pages/[type].js

"use client" // Enables client-side rendering in Next.js

import Link from 'next/link';
import { Suspense, useMemo } from 'react';
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react';
import { useSampleData } from '@/hooks/useSampleData';
import { useUserData } from '@/hooks/useUserData';
import { NlFilterBar } from '@/components/nest/NlFilterBar';
import { DataTable } from '@/components/tables/data-table';
import { prepend_path } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { baseColumns, typeColumns } from '../columns';
import { getSampleNamebyId } from '@/hooks/sampleHooks';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { getUserNameById } from "@/hooks/userHooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SmartVaul } from '@/components/forms/smart-vaul';
import { handleDeleteSample, handleEditSample, handleStatusChangeSample, handleStatusIncrementSample, handleExportAllSamplesRelated } from '@/utils/handlers/sampleHandlers';

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function TypePageContent() {
    const pathname = usePathname();
    const type = pathname.split('/').pop();
    const typeLabel = capitalizeFirstLetter(type);
    const { filters, filterData, hasFilters, buildUrlWithoutFilter } = useUrlFilters();
    const { samplesData, samplesError } = useSampleData(prepend_path);
    const { usersData, usersError } = useUserData(prepend_path);

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

    const filterColumns = useMemo(
        () => (dataTableData.length ? Object.keys(dataTableData[0]) : []),
        [dataTableData]
    );

    if (samplesError) {
        return <div>Error loading data</div>;
    }

    if (!samplesData || !usersData) {
        return <Skeleton className="h-[500px] w-[1000px] rounded-xl" />;
    }

    if (usersError) {
        return <div>Error loading data</div>;
    }


    const columns = typeColumns[type] || baseColumns;

    return (
        (filteredData.length === 0 || !filteredData.length) ?
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle> {typeLabel} </CardTitle>
                        <CardDescription> No samples of this type were found</CardDescription>
                    </div>
                    <SmartVaul formType='samples' users={usersData} samples={samplesData} page={type || ""} size="sm" className="ml-auto gap-1" />
                </CardHeader>
            </Card>
            :
            <Card>
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle> {typeLabel} </CardTitle>
                        <CardDescription> Here you can find your samples of the selected type and access more informations about them</CardDescription>
                    </div>
                    <div className="ml-auto flex gap-2 items-center">
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
                                <DropdownMenuItem onClick={() => handleExportAllSamplesRelated('json')}>
                                    JSON
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExportAllSamplesRelated('csv')}>
                                    CSV (flattened)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <SmartVaul formType='samples' users={usersData} samples={samplesData} page={type || ""} size="sm" className="gap-1" />
                    </div>
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

                    <DataTable
                        onStatusChange={handleStatusChangeSample}
                        onDelete={handleDeleteSample}
                        onEdit={handleEditSample}
                        onIncrement={handleStatusIncrementSample}
                        columns={columns}
                        data={dataTableData} />
                </CardContent>
            </Card>
    );
}

export default function TypePage() {
    return (
        <Suspense fallback={<Skeleton className="h-[500px] w-[1000px] rounded-xl" />}>
            <TypePageContent />
        </Suspense>
    );
}
// pages/[type].js

"use client" // Enables client-side rendering in Next.js

import { usePathname } from 'next/navigation'
import { useEffect, useMemo } from 'react';
import { useSampleData } from '@/hooks/useSampleData';
import { useUserData } from '@/hooks/useUserData';
import { DataTable } from '@/components/tables/data-table';
import { prepend_path } from "@/lib/utils";
import { Skeleton } from '@/components/ui/skeleton';
import { baseColumns, typeColumns } from '../columns';
import { getSampleNamebyId } from '@/hooks/sampleHooks';
import { getUserNameById } from "@/hooks/userHooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SmartVaul } from '@/components/forms/smart-vaul';
import { handleDeleteSample, handleEditSample, handleStatusChangeSample, handleStatusIncrementSample } from '@/utils/handlers/sampleHandlers';
import { usePreloadData } from '@/hooks/usePreloadData';

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

export default function TypePage() {
    const type = usePathname().split('/').pop();
    const typeLabel = capitalizeFirstLetter(type);
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
        return filteredData.map(sample => ({
            ...sample,
            parentName: getSampleNamebyId(sample.parentId, samplesData),
            responsibleName: getUserNameById(sample.responsible, usersData)
        }));
    }, [filteredData, samplesData, usersData]);

    if (samplesError) {
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
                <CardHeader>
                    <div>
                        <CardTitle> {typeLabel} </CardTitle>
                        <CardDescription> Here you can find your samples of the selected type and access more informations about them</CardDescription>
                    </div>
                    <SmartVaul formType='samples' users={usersData} samples={samplesData} page={type || ""} size="sm" className="ml-auto gap-1" />
                </CardHeader>
                <CardContent>
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
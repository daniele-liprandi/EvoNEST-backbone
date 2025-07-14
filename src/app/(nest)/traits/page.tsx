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
import { handleDeleteTrait, handleStatusChangeTrait, handleStatusIncrementTrait } from '@/utils/handlers/traitHandlers';
import { SmartVaul } from '@/components/forms/smart-vaul';
import { useTraitData } from '@/hooks/useTraitData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TraitsPage() {
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
                    <SmartVaul 
                        formType='traits' 
                        users={usersData} 
                        samples={samplesData} 
                        traits={traitsData} 
                        size="sm" 
                        className="ml-auto gap-1" 
                    />
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
        </div>
    );
}
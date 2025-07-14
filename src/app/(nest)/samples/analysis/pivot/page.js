"use client"

// pages/pivot.js
import PivotTableComponent from '@/components/pivot-table';
import { useSampleData } from '@/hooks/useSampleData';
import { prepend_path } from '@/lib/utils';
import { useUserData } from '@/hooks/useUserData';
import { getSampleNamebyId } from '@/hooks/sampleHooks';
import { getUserNameById } from '@/hooks/userHooks';

export default function PivotPage() {

    const { samplesData, samplesError } = useSampleData(prepend_path);
    const { usersData } = useUserData(prepend_path);

    if (!samplesData || !usersData) {
        return (
            <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
                <p className="text-lg text-center">Loading...</p>
            </div>
        );
    }
    if (samplesError) {
        return (
            <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
                <p className="text-lg text-center">An error occurred while fetching the data.</p>
            </div>
        );
    }

    const dataTableData = samplesData.map((sample) => ({
        ...sample,
        parentName: getSampleNamebyId(sample.parentId, samplesData),
        responsibleName: getUserNameById(sample.responsible, usersData)
    }));

    return (
        <div className="min-h-screen  py-4 px-4 sm:px-6 lg:px-8">
            <div className="max-w-8xl mx-auto p-8 rounded-lg shadow-md">
                <h1>Pivot Table Example</h1>
                <p>Filter the data by clicking on a field. Try to click on type and select only subsample samples.</p> 
                <p>Click on the arrows near Count to order the rows and the columns according to the currently used value.</p> 
                <PivotTableComponent data={dataTableData} />
            </div>
        </div>
    );
};


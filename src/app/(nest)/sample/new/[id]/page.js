"use client"

import { SmartVaul } from "@/components/forms/smart-vaul";
import { usePathname } from "next/navigation";
import { useSampleData } from "@/hooks/useSampleData";
import { useUserData } from "@/hooks/useUserData";
import { prepend_path } from "@/lib/utils";
import { Button } from "@/components/ui/button"
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export default function NewSampleIdPage() {
    const sampleId = usePathname().split('/').pop();
    const { samplesData, samplesError } = useSampleData(prepend_path);
    const { usersData, usersError } = useUserData(prepend_path);

    /* After the sample is created, redirect the page to sample/[id] */
    if (samplesData && samplesData.find(sample => sample._id === sampleId)) {
        window.location.href = `/sample/${sampleId}`;
    }



    if (samplesError || usersError) {
        return <div>Error loading samples</div>;
    }
    if (!samplesData || !usersData) {
        return <div>Loading...</div>;
    }

    /* If the id is smaller than 12 numbers, return error message */
    if (sampleId.length < 6) {
        return <div>Sample ID has to be longer than 6 characters</div>;
    }

    return (
        <div>
            <Card className="sm:col-span-2">
                <CardHeader className="pb-3">
                    <CardTitle>New sample from custom ID</CardTitle>
                    <CardDescription className="max-w-lg text-balance leading-relaxed">
                        Create a new sample with the custom ID <strong>{sampleId}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <SmartVaul formType="samples" users={usersData} samples={samplesData} id={sampleId} page="general" size="sm" className="ml-auto gap-1" />
                </CardFooter>
            </Card>
        </div>
    )
}
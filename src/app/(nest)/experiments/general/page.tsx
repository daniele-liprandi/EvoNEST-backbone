"use client"

import { SmartVaul } from "@/components/forms/smart-vaul";

import { dateColumn, logbookColumn, responsibleColumn, sampleColumn, selectColumn, typeColumn } from "@/components/tables/columns";
import { DataTable } from '@/components/tables/data-table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSampleNamebyId } from "@/hooks/sampleHooks";
import { useExperimentsData } from '@/hooks/useExperimentData';
import { getUserNameById } from "@/hooks/userHooks";
import { useSampleData } from '@/hooks/useSampleData';
import { useUserData } from '@/hooks/useUserData';
import { prepend_path } from "@/lib/utils";
import { CellContext } from '@tanstack/react-table';
import { MdDelete } from "react-icons/md";
import { toast } from "sonner";
import { mutate } from "swr";
import { handleDeleteExperiment, handleExperimentFileDownload, handleStatusChangeExperiment, handleStatusIncrementExperiment } from "@/utils/handlers/experimentHandlers";
import { Button } from "@/components/ui/button";

export interface Experiment {
  _id: string;
  name: string;
  [key: string]: any;  // Index signature for dynamic properties
  // other fields...
}
interface TableMeta {
  onDelete: (id: string) => void;
  // other meta properties if any...
}


const baseColumns = [
  logbookColumn(),
  { accessorKey: "name", header: "Name" },
  sampleColumn("sampleId", "sampleName", "Sample"),
  responsibleColumn(),
  dateColumn(),
  typeColumn(),
  {
    accessorKey: "fileId",
    header: "Download",
    cell: (info: CellContext<Experiment, unknown>) => {
      const experiment = info.row.original;
      return (
        (experiment.fileId) &&
        <Button onClick={() => handleExperimentFileDownload(experiment.fileId)}>Download</Button> 
      );
    },
  },
  {
    accessorKey: "Actions",
    cell: (info: CellContext<Experiment, unknown>) => {
      const experiment = info.row.original;
      const { onDelete } = info.table.options.meta as TableMeta;
      return (
        <div>
          <AlertDialog>
            <AlertDialogTrigger><MdDelete className="h-4 w-4" /></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete experiment {experiment._id}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(experiment._id)}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];


export default function ExperimentPage() {

  const { samplesData, samplesError } = useSampleData(prepend_path, {
    revalidateIfStale: false, // Don't revalidate on mount if we have data
    revalidateOnFocus: false, // Don't revalidate on window focus
    keepPreviousData: true, // Keep showing previous data while loading
  });
  const { experimentsData, experimentsError } = useExperimentsData(prepend_path, false, undefined, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
});
  const { usersData, usersError } = useUserData(prepend_path);


  if (!samplesData || !experimentsData || !usersData) {
    return (<p className="text-lg text-center">Loading...</p>);
  }
  if (samplesError || experimentsError || usersError) {
    return (<p className="text-lg text-center">An error occurred while fetching the data.</p>);
  }


  const dataTableData = experimentsData?.map((experiment: any) => {
    const scaledExperiment = experiment;

    return {
      ...scaledExperiment,
      sampleName: getSampleNamebyId(experiment.sampleId, samplesData),
      responsibleName: getUserNameById(experiment.responsible, usersData),
      actions: null, // This will be handled by the actions column
    };
  }) || [];

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-2 sm:pl-5 sm:pr-5">
        <Card >
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Experiments</CardTitle>
              <CardDescription>
                The collection of experiments in the NEST
              </CardDescription>
            </div>
            <SmartVaul formType='experiments' users={usersData} samples={samplesData} experiments={experimentsData} size="sm" className="ml-auto gap-1" />
          </CardHeader>
          <CardContent>
            <DataTable columns={baseColumns} data={dataTableData} onDelete={handleDeleteExperiment} onEdit={null} onStatusChange={handleStatusChangeExperiment} onIncrement={handleStatusIncrementExperiment}
            ></DataTable>
          </CardContent>
        </Card>
      </div>
    </div >
  )
}
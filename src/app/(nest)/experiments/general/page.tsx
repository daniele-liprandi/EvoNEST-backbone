"use client"

import { Suspense, useMemo } from "react";
import { CellContext, Table as TanstackTable } from "@tanstack/react-table";

import { SmartVaul } from "@/components/forms/smart-vaul";
import { dateColumn, logbookColumn, responsibleColumn, rowActionsColumn, sampleColumn, selectColumn, typeColumn } from "@/components/tables/columns";
import { experimentEditFields } from "@/components/tables/edit-fields";
import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSampleNamebyId } from "@/hooks/sampleHooks";
import { useExperimentsData } from "@/hooks/useExperimentData";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { getUserNameById } from "@/hooks/userHooks";
import { useSampleData } from "@/hooks/useSampleData";
import { useUserData } from "@/hooks/useUserData";
import { prepend_path } from "@/lib/utils";
import { handleBulkDeleteExperiments, handleBulkUpdateExperimentFields, handleDeleteExperiment, handleExperimentFileDownload, handleStatusChangeExperiment, handleStatusIncrementExperiment, handleUpdateExperimentFields } from "@/utils/handlers/experimentHandlers";

export interface Experiment {
  _id: string;
  name: string;
  [key: string]: any;
}

const baseColumns = [
  selectColumn(),
  logbookColumn(),
  { accessorKey: "name", header: "Name" },
  sampleColumn("sampleId", "sampleName", "Sample"),
  responsibleColumn(),
  dateColumn(),
  typeColumn(),
  {
    accessorKey: "fileId",
    header: "File",
    cell: (info: CellContext<Experiment, unknown>) => {
      const experiment = info.row.original;
      return experiment.fileId ? (
        <Button variant="outline" size="sm" onClick={() => handleExperimentFileDownload(experiment.fileId)}>
          Download
        </Button>
      ) : null;
    },
  },
  rowActionsColumn({ entityLabel: "experiment", editFields: experimentEditFields }),
];

function ExperimentPageContent() {
  const { filterData } = useUrlFilters();

  const { samplesData, samplesError } = useSampleData(prepend_path, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
  const { experimentsData, experimentsError } = useExperimentsData(prepend_path, false, undefined, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
  });
  const { usersData, usersError } = useUserData(prepend_path);

  const dataTableData = useMemo(() => {
    if (!samplesData || !experimentsData || !usersData) {
      return [];
    }
    return filterData(
      experimentsData.map((experiment: any) => ({
        ...experiment,
        sampleName: getSampleNamebyId(experiment.sampleId, samplesData),
        responsibleName: getUserNameById(experiment.responsible, usersData),
      }))
    );
  }, [samplesData, experimentsData, usersData, filterData]);

  if (samplesError || experimentsError || usersError) {
    return <p className="p-6 text-sm text-destructive">Could not load experiments.</p>;
  }

  if (!samplesData || !experimentsData || !usersData) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  const newButton = (
    <SmartVaul formType="experiments" users={usersData} samples={samplesData} experiments={experimentsData} size="sm" />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Experiments</CardTitle>
        <CardDescription>Every experiment in the NEST.</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={baseColumns}
          data={dataTableData}
          onDelete={handleDeleteExperiment}
          onEdit={null}
          onStatusChange={handleStatusChangeExperiment}
          onIncrement={handleStatusIncrementExperiment}
          onUpdateFields={handleUpdateExperimentFields}
          onBulkDelete={handleBulkDeleteExperiments}
          onBulkUpdateFields={handleBulkUpdateExperimentFields}
          bulkEditFields={experimentEditFields}
          bulkEntityLabel="experiment"
          renderToolbar={(table: TanstackTable<any>) => (
            <DataTableToolbar table={table} entity="experiments">
              {newButton}
            </DataTableToolbar>
          )}
        />
      </CardContent>
    </Card>
  );
}

export default function ExperimentPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <ExperimentPageContent />
    </Suspense>
  );
}

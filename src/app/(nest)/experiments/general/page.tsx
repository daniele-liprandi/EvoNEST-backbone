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
import { useExperimentsData } from "@/hooks/useExperimentData";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { useSampleData } from "@/hooks/useSampleData";
import { useUserData } from "@/hooks/useUserData";
import { tableSwrConfig } from "@/hooks/swrConfig";
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

  const { samplesData, samplesError } = useSampleData(prepend_path, tableSwrConfig);
  const { experimentsData, experimentsError } = useExperimentsData(prepend_path, false, undefined, tableSwrConfig);
  const { usersData, usersError } = useUserData(prepend_path, tableSwrConfig);

  const dataTableData = useMemo(() => {
    if (!samplesData || !experimentsData || !usersData) {
      return [];
    }
    const sampleName = new Map<string, string>(samplesData.map((s: any) => [s._id, s.name]));
    const userName = new Map<string, string>(usersData.map((u: any) => [u._id, u.name]));
    return filterData(
      experimentsData.map((experiment: any) => ({
        ...experiment,
        sampleName: sampleName.get(experiment.sampleId) ?? "",
        responsibleName: userName.get(experiment.responsible) ?? "",
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

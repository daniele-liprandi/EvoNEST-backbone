"use client"

import { Suspense, useMemo } from "react";
import { CellContext, Table as TanstackTable } from "@tanstack/react-table";

import { SmartVaul } from "@/components/forms/smart-vaul";
import { dateColumn, imageColumn, responsibleColumn, rowActionsColumn, sampleColumn, selectColumn } from "@/components/tables/columns";
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
  { accessorKey: "name", header: "Name" },
  sampleColumn("sampleId", "sampleName", "Sample"),
  responsibleColumn(),
  dateColumn(),
  imageColumn("rawdata"),
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
  rowActionsColumn({ entityLabel: "media experiment", editFields: experimentEditFields }),
];

function MediaPageContent() {
  const { filterData } = useUrlFilters();

  const { samplesData, samplesError } = useSampleData(prepend_path, tableSwrConfig);
  const { experimentsData, experimentsError } = useExperimentsData(prepend_path, true, undefined, tableSwrConfig);
  const { usersData, usersError } = useUserData(prepend_path, tableSwrConfig);

  const dataTableData = useMemo(() => {
    if (!samplesData || !experimentsData || !usersData) {
      return [];
    }
    const sampleName = new Map<string, string>(samplesData.map((s: any) => [s._id, s.name]));
    const userName = new Map<string, string>(usersData.map((u: any) => [u._id, u.name]));
    return filterData(
      experimentsData
        .filter((experiment: any) => experiment.type === "image")
        .map((experiment: any) => ({
          ...experiment,
          sampleName: sampleName.get(experiment.sampleId) ?? "",
          responsibleName: userName.get(experiment.responsible) ?? "",
        }))
        .sort(
          (a: { date: string | number | Date }, b: { date: string | number | Date }) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )
    );
  }, [samplesData, experimentsData, usersData, filterData]);

  if (samplesError || experimentsError || usersError) {
    return <p className="p-6 text-sm text-destructive">Could not load media experiments.</p>;
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
        <CardTitle>Media experiments</CardTitle>
        <CardDescription>Images and videos recorded in the NEST.</CardDescription>
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
          bulkEntityLabel="media experiment"
          renderToolbar={(table: TanstackTable<any>) => (
            <DataTableToolbar table={table} entity="media">
              {newButton}
            </DataTableToolbar>
          )}
        />
      </CardContent>
    </Card>
  );
}

export default function MediaPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <MediaPageContent />
    </Suspense>
  );
}

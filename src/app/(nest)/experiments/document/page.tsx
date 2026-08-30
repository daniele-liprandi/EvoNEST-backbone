"use client"

import { Suspense, useMemo } from "react";
import { CellContext, Table as TanstackTable } from "@tanstack/react-table";

import { SmartVaul } from "@/components/forms/smart-vaul";
import { dateColumn, responsibleColumn, rowActionsColumn, sampleColumn, selectColumn } from "@/components/tables/columns";
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
  { accessorKey: "name", header: "Name" },
  sampleColumn("sampleId", "sampleName", "Sample"),
  responsibleColumn(),
  dateColumn(),
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
  rowActionsColumn({ entityLabel: "document", editFields: experimentEditFields }),
];

function DocumentsPageContent() {
  const { filterData } = useUrlFilters();

  const { samplesData, samplesError } = useSampleData(prepend_path);
  const { experimentsData, experimentsError } = useExperimentsData(prepend_path, true);
  const { usersData, usersError } = useUserData(prepend_path);

  const dataTableData = useMemo(() => {
    if (!samplesData || !experimentsData || !usersData) {
      return [];
    }
    return filterData(
      experimentsData
        .filter((experiment: any) => experiment.type === "document")
        .map((experiment: any) => ({
          ...experiment,
          sampleName: getSampleNamebyId(experiment.sampleId, samplesData),
          responsibleName: getUserNameById(experiment.responsible, usersData),
        }))
    );
  }, [samplesData, experimentsData, usersData, filterData]);

  if (samplesError || experimentsError || usersError) {
    return <p className="p-6 text-sm text-destructive">Could not load documents.</p>;
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
        <CardTitle>Documents</CardTitle>
        <CardDescription>PDFs and docs attached to experiments.</CardDescription>
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
          bulkEntityLabel="document"
          renderToolbar={(table: TanstackTable<any>) => (
            <DataTableToolbar table={table} entity="documents">
              {newButton}
            </DataTableToolbar>
          )}
        />
      </CardContent>
    </Card>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <DocumentsPageContent />
    </Suspense>
  );
}

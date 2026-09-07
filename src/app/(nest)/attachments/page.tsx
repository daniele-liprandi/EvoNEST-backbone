"use client";

import { Suspense, useMemo } from "react";
import { CellContext, Table as TanstackTable } from "@tanstack/react-table";

import { dateColumn, responsibleColumn, rowActionsColumn, selectColumn } from "@/components/tables/columns";
import { DataTable } from "@/components/tables/data-table";
import { DataTableToolbar } from "@/components/tables/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAttachmentsData, type Attachment } from "@/hooks/useAttachmentData";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { useSampleData } from "@/hooks/useSampleData";
import { useUserData } from "@/hooks/useUserData";
import { tableSwrConfig } from "@/hooks/swrConfig";
import { prepend_path } from "@/lib/utils";
import {
  handleBulkDeleteAttachments,
  handleDeleteAttachment,
  handleAttachmentDownload,
} from "@/utils/handlers/attachmentHandlers";

type Row = Attachment & { targetName: string; responsibleName: string };

const previewColumn = {
  id: "preview",
  header: "Preview",
  enableSorting: false,
  cell: (info: CellContext<Row, unknown>) => {
    const row = info.row.original;
    if (row.kind !== "image") {
      return <Badge variant="outline">{row.kind}</Badge>;
    }
    return (
      <img
        src={`${prepend_path}/api/files/${row.fileId}`}
        alt={row.caption || "attachment"}
        className="h-12 w-12 rounded object-cover"
      />
    );
  },
};

const baseColumns = [
  selectColumn(),
  previewColumn,
  { accessorKey: "caption", header: "Caption", meta: { label: "Caption" } },
  {
    accessorKey: "targetName",
    header: "Target",
    meta: { label: "Target" },
    cell: (info: CellContext<Row, unknown>) => {
      const row = info.row.original;
      return (
        <span className="text-sm">
          <Badge variant="secondary" className="mr-1">
            {row.targetType}
          </Badge>
          {row.targetName}
        </span>
      );
    },
  },
  { accessorKey: "kind", header: "Kind", meta: { label: "Kind" } },
  { accessorKey: "category", header: "Category", meta: { label: "Category" } },
  responsibleColumn(),
  dateColumn(),
  {
    id: "download",
    header: "File",
    enableSorting: false,
    cell: (info: CellContext<Row, unknown>) => (
      <Button variant="outline" size="sm" onClick={() => handleAttachmentDownload(info.row.original.fileId)}>
        Download
      </Button>
    ),
  },
  rowActionsColumn({ entityLabel: "attachment", titleField: "caption" }),
];

function AttachmentsPageContent() {
  const { filterData } = useUrlFilters();

  const { attachmentsData, attachmentsError } = useAttachmentsData({}, tableSwrConfig);
  const { samplesData, samplesError } = useSampleData(prepend_path, tableSwrConfig);
  const { usersData, usersError } = useUserData(prepend_path, tableSwrConfig);

  const rows = useMemo<Row[]>(() => {
    if (!attachmentsData || !samplesData || !usersData) return [];
    const sampleName = new Map<string, string>(samplesData.map((s: any) => [s._id, s.name]));
    const userName = new Map<string, string>(usersData.map((u: any) => [u._id, u.name]));
    const decorated: Row[] = attachmentsData.map((a) => ({
      ...a,
      targetName: a.targetType === "sample" ? sampleName.get(a.targetId) ?? a.targetId : a.targetId,
      responsibleName: a.responsible ? userName.get(a.responsible) ?? "" : "",
    }));
    return filterData(decorated) as Row[];
  }, [attachmentsData, samplesData, usersData, filterData]);

  if (attachmentsError || samplesError || usersError) {
    return <p className="p-6 text-sm text-destructive">Could not load attachments.</p>;
  }
  if (!attachmentsData || !samplesData || !usersData) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attachments</CardTitle>
        <CardDescription>Every file linked to a sample, trait or experiment in the NEST.</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={baseColumns}
          data={rows}
          onDelete={handleDeleteAttachment}
          onEdit={null}
          onBulkDelete={handleBulkDeleteAttachments}
          bulkEntityLabel="attachment"
          renderToolbar={(table: TanstackTable<any>) => (
            <DataTableToolbar table={table} entity="attachments" />
          )}
        />
      </CardContent>
    </Card>
  );
}

export default function AttachmentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <AttachmentsPageContent />
    </Suspense>
  );
}

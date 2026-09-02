"use client";

import { useState } from "react";
import { PencilSimple, Trash, X } from "@phosphor-icons/react";

import { RowEditDialog } from "@/components/tables/row-edit-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Strip shown by DataTable while one or more rows are selected. Holds the
 * bulk actions that apply to the selection; `children` is where a page adds
 * its own (e.g. bulk edit). Row ids come from getRowId in DataTable.
 *
 * @param {{
 *   table: any,
 *   onBulkDelete?: ((ids: string[]) => Promise<any> | any) | null,
 *   onBulkUpdateFields?: ((ids: string[], changes: Record<string, any>) => Promise<any> | any) | null,
 *   bulkEditFields?: any[],
 *   entityLabel?: string,
 *   children?: any,
 * }} props
 */
export function BulkActionsBar({
  table,
  onBulkDelete = null,
  onBulkUpdateFields = null,
  bulkEditFields = [],
  entityLabel = "row",
  children = null,
}) {
  const [deleting, setDeleting] = useState(false);
  const selected = table.getFilteredSelectedRowModel().rows;

  if (selected.length === 0) {
    return null;
  }

  const count = selected.length;
  const noun = count === 1 ? entityLabel : `${entityLabel}s`;
  const canBulkEdit = onBulkUpdateFields && bulkEditFields.length > 0;

  async function confirmDelete() {
    setDeleting(true);
    try {
      await onBulkDelete(selected.map((row) => row.id));
      table.resetRowSelection();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
      <span className="font-medium">
        {count} {noun} selected
      </span>
      <div className="ml-auto flex items-center gap-2">
        {children}
        {canBulkEdit ? (
          <RowEditDialog
            rows={selected.map((row) => row.original)}
            fields={bulkEditFields}
            entityLabel={entityLabel}
            onSubmit={(ids, changes) => onBulkUpdateFields(ids, changes)}
            trigger={
              <Button variant="outline" size="sm">
                <PencilSimple className="size-4" /> Edit
              </Button>
            }
          />
        ) : null}
        {onBulkDelete ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash className="size-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {count} {noun}?
                </AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => table.resetRowSelection()}>
          <X className="size-4" /> Clear
        </Button>
      </div>
    </div>
  );
}

"use client";

import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rankItem } from "@tanstack/match-sorter-utils";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useState } from "react";
import { CaretLeft, CaretRight, CaretDoubleLeft, CaretDoubleRight } from "@phosphor-icons/react";

import { BulkActionsBar } from "@/components/tables/bulk-actions-bar";

const fuzzyFilter = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value);

  // Store the itemRank info
  addMeta({
    itemRank,
  });

  return itemRank.passed;
};

/**
 * @param {{
 *   columns: any[],
 *   data: any[],
 *   onDelete?: Function | null,
 *   onEdit?: Function | null,
 *   onStatusChange?: Function | null,
 *   onIncrement?: Function | null,
 *   onUpdateFields?: ((id: string, changes: Record<string, any>) => Promise<any> | any) | null,
 *   onBulkDelete?: ((ids: string[]) => Promise<any> | any) | null,
 *   onBulkUpdateFields?: ((ids: string[], changes: Record<string, any>) => Promise<any> | any) | null,
 *   bulkEditFields?: any[],
 *   bulkRegenerateOn?: { fields: string[], label: string },
 *   bulkEntityLabel?: string,
 *   renderToolbar?: ((table: any) => any) | null,
 *   renderBulkActions?: ((table: any) => any) | null,
 * }} props
 */
export function DataTable({
  columns,
  data,
  onDelete = null,
  onEdit = null,
  onStatusChange = null,
  onIncrement = null,
  onUpdateFields = null,
  onBulkDelete = null,
  onBulkUpdateFields = null,
  bulkEditFields = [],
  bulkRegenerateOn = undefined,
  bulkEntityLabel = "row",
  renderToolbar = null,
  renderBulkActions = null,
}) {
  const [columnFilters, setColumnFilters] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0, //initial page index
    pageSize: 10, //default page size
  });

  const table = useReactTable({
    data,
    columns,
    meta: {
      onDelete,
      onEdit,
      onStatusChange,
      onIncrement,
      onUpdateFields,
    },
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    getRowId: (row) => row._id ?? row.id,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false, //turn off auto reset of pageIndex
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      columnVisibility,
      pagination,
    },
  });

  return (
    <div className="flex flex-col gap-3">
      {renderToolbar?.(table)}
      {(onBulkDelete || onBulkUpdateFields || renderBulkActions) && (
        <BulkActionsBar
          table={table}
          onBulkDelete={onBulkDelete}
          onBulkUpdateFields={onBulkUpdateFields}
          bulkEditFields={bulkEditFields}
          bulkRegenerateOn={bulkRegenerateOn}
          entityLabel={bulkEntityLabel}
        >
          {renderBulkActions?.(table)}
        </BulkActionsBar>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 py-2">
        <p className="mr-auto text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length > 0
            ? `${table.getFilteredSelectedRowModel().rows.length} of ${table.getFilteredRowModel().rows.length} selected`
            : `${table.getFilteredRowModel().rows.length} row${table.getFilteredRowModel().rows.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.firstPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <CaretDoubleLeft />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <CaretLeft />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <CaretRight />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.lastPage()}
          disabled={!table.getCanNextPage()}
        >
          <CaretDoubleRight />
        </Button>
      </div>
    </div>
  );
}

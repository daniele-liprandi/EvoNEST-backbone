"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, DownloadSimple, SlidersHorizontal } from "@phosphor-icons/react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { NlFilterBar } from "@/components/nest/NlFilterBar";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// "recentChangeDate" -> "Recent change date". Fallback for a column whose def
// carries no meta.label (most headers are JSX so there is no plain-text label
// to reuse otherwise) — see columnLabel below.
function humanise(id) {
  return id
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

// Prefer the column def's own label (set on custom/config-driven fields and
// the built-ins whose title doesn't match their humanised accessor key) over
// guessing one from the raw data key.
function columnLabel(column) {
  return column.columnDef.meta?.label ?? humanise(column.id);
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Filter bar, active-filter chips, one export control and a slot for the
 * page's primary action. Rendered by DataTable through its `renderToolbar`
 * prop so it has the table instance for the current-view export and for the
 * filterable column list.
 */
/**
 * @param {{
 *   table: any,
 *   entity: string,
 *   onExportRelated?: ((format: string) => any) | null,
 *   children?: any,
 * }} props
 */
export function DataTableToolbar({ table, entity, onExportRelated = null, children = null }) {
  const pathname = usePathname();
  const { filters, hasFilters, buildUrlWithoutFilter } = useUrlFilters();

  const filterColumns = table
    .getAllColumns()
    .filter((column) => column.getCanFilter())
    .map((column) => column.id);

  const rows = () => table.getFilteredRowModel().rows.map((row) => row.original);
  const stamp = new Date().toISOString().slice(0, 10);

  const exportCsv = () =>
    saveBlob(
      new Blob([Papa.unparse(rows())], { type: "text/csv;charset=utf-8;" }),
      `${entity}_${stamp}.csv`
    );

  const exportJson = () =>
    saveBlob(
      new Blob([JSON.stringify(rows(), null, 2)], { type: "application/json" }),
      `${entity}_${stamp}.json`
    );

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(rows());
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveBlob(
      new Blob([buffer], { type: "application/octet-stream" }),
      `${entity}_${stamp}.xlsx`
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <NlFilterBar columns={filterColumns} />
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {columnLabel(column)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <DownloadSimple /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>This view</DropdownMenuLabel>
              <DropdownMenuItem onSelect={exportExcel}>Excel</DropdownMenuItem>
              <DropdownMenuItem onSelect={exportCsv}>CSV</DropdownMenuItem>
              <DropdownMenuItem onSelect={exportJson}>JSON</DropdownMenuItem>
              {onExportRelated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>With related data</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => onExportRelated("json")}>JSON</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onExportRelated("csv")}>CSV</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {children}
        </div>
      </div>

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtered by:</span>
          {filters.map(({ key, values }) => (
            <Badge key={key} variant="secondary" className="gap-1 pr-1">
              {key}: {values.join(", ")}
              <Link href={buildUrlWithoutFilter(key, pathname)} aria-label={`Remove the ${key} filter`}>
                <X className="size-3" />
              </Link>
            </Badge>
          ))}
          <Link href={pathname}>
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              Clear all
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

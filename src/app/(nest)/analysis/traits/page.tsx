"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";

import { DimensionSelect } from "@/components/analysis/DimensionSelect";
import { FilterBar } from "@/components/analysis/FilterBar";
import { sortableFilterableColumn, sortableFilterableNumericColumn } from "@/components/tables/columns";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalysisOptions, useAnalysisResult, useAnalysisUrlState } from "@/hooks/useAnalysis";
import { serialiseAnalysisState } from "@/lib/analysis/url-state";
import { AGGREGATION_LABELS, AGGREGATIONS, formatStat } from "@/lib/analysis/stats";

const DEFAULTS = { source: "traits" as const, rows: ["species", "subsampletype"] };

function TraitStatisticsContent() {
  const [state, update] = useAnalysisUrlState(DEFAULTS);
  const { options, optionsError } = useAnalysisOptions("traits");
  const dimensions = options?.dimensions ?? [];
  const label = (id: string) => dimensions.find((d) => d.id === id)?.label ?? id;

  const quantity = state.quantity || options?.quantities.find((q) => q.count > 0)?.value || "";
  const [row1, row2] = state.rows;

  const request = useMemo(() => {
    if (!options || !quantity) return null;
    const known = new Set(options.dimensions.map((d) => d.id));
    return {
      source: "traits" as const,
      rows: state.rows.filter((r) => known.has(r)),
      column: null,
      quantity,
      filters: Object.fromEntries(Object.entries(state.filters).filter(([k]) => known.has(k))),
    };
  }, [options, state, quantity]);
  const { result, resultError, loading } = useAnalysisResult(request);

  const rowIds = request?.rows ?? [];
  const columns = useMemo(
    () => [
      ...rowIds.map((id, i) => sortableFilterableColumn(`k${i}`, label(id))),
      ...AGGREGATIONS.map((a) => ({
        ...sortableFilterableNumericColumn(a, AGGREGATION_LABELS[a]),
        cell: (info: { getValue: () => unknown }) => formatStat(info.getValue() as number | null, a),
      })),
    ],
     
    [rowIds.join(","), dimensions],
  );
  const tableData = useMemo(
    () =>
      (result?.rows ?? []).map((r) => ({
        ...Object.fromEntries(r.key.map((k, i) => [`k${i}`, k])),
        ...r.total,
      })),
    [result],
  );

  const tablesHref = `/analysis/tables?${serialiseAnalysisState({
    source: "traits",
    quantity,
    rows: rowIds,
    aggregation: "mean",
    filters: state.filters,
  })}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trait statistics</CardTitle>
        <CardDescription>Mean, standard deviation, range and median of one trait type, by group.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {optionsError && <p className="text-sm text-destructive">Could not load the trait types.</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="trait-select">Trait type</Label>
            <Select value={quantity} onValueChange={(v) => update({ quantity: v })}>
              <SelectTrigger id="trait-select">
                <SelectValue placeholder="No trait types yet" />
              </SelectTrigger>
              <SelectContent>
                {options?.quantities.map((q) => (
                  <SelectItem key={q.value} value={q.value}>
                    {q.label} ({q.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DimensionSelect
            id="groupby-select"
            label="Group by"
            dimensions={dimensions}
            value={row1 ?? null}
            noneLabel="No grouping"
            exclude={row2 ? [row2] : []}
            onChange={(v) => update({ rows: v ? [v, ...(row2 ? [row2] : [])] : [] })}
          />
          <DimensionSelect
            id="then-select"
            label="Then by"
            dimensions={dimensions}
            value={row2 ?? null}
            noneLabel="None"
            exclude={row1 ? [row1] : []}
            onChange={(v) => update({ rows: [...(row1 ? [row1] : []), ...(v ? [v] : [])] })}
          />
        </div>

        <FilterBar dimensions={dimensions} filters={state.filters} onChange={(filters) => update({ filters })} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {result && (
              <Badge variant="outline">
                {result.metadata.matched} of {result.metadata.total} traits
              </Badge>
            )}
            {result?.unit && <Badge variant="secondary">{result.unit}</Badge>}
          </div>
          {quantity && (
            <Button asChild variant="outline" size="sm">
              <Link href={tablesHref}>Open as a summary table</Link>
            </Button>
          )}
        </div>

        {resultError ? (
          <p className="text-sm text-destructive">Could not compute the statistics.</p>
        ) : options && !quantity ? (
          <p className="text-sm text-muted-foreground">There are no traits in this NEST yet.</p>
        ) : !result || (loading && !result) ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <DataTable
            columns={columns}
            data={tableData}
            onDelete={null}
            onEdit={null}
            onIncrement={null}
            onStatusChange={null}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function TraitStatisticsPage() {
  return (
    <div className="container px-4 py-6 md:px-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <TraitStatisticsContent />
      </Suspense>
    </div>
  );
}

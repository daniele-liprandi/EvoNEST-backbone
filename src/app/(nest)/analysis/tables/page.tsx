"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { DownloadSimple } from "@phosphor-icons/react";

import { DimensionSelect } from "@/components/analysis/DimensionSelect";
import { FilterBar } from "@/components/analysis/FilterBar";
import { SummaryTable } from "@/components/analysis/SummaryTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAnalysisOptions, useAnalysisResult, useAnalysisUrlState, type Source } from "@/hooks/useAnalysis";
import { pivotToCsv } from "@/lib/analysis/csv";
import { AGGREGATION_LABELS, AGGREGATIONS, type Aggregation } from "@/lib/analysis/stats";

const DEFAULTS = { source: "samples" as Source, rows: ["type"], column: null, aggregation: "mean" as Aggregation };

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function SummaryTablesContent() {
  const [state, update] = useAnalysisUrlState(DEFAULTS);
  const { options, optionsError } = useAnalysisOptions(state.source);
  const dimensions = options?.dimensions ?? [];
  const label = (id: string) => dimensions.find((d) => d.id === id)?.label ?? id;

  const quantity =
    state.source === "traits"
      ? state.quantity || options?.quantities.find((q) => q.count > 0)?.value || ""
      : undefined;
  const quantityOption = options?.quantities.find((q) => q.value === quantity);
  const aggregation: Aggregation = state.source === "samples" ? "n" : state.aggregation;
  const [row1, row2] = state.rows;

  const request = useMemo(() => {
    if (!options) return null;
    if (state.source === "traits" && !quantity) return null;
    // After a source switch, some dimensions may not exist
    const known = new Set(options.dimensions.map((d) => d.id));
    return {
      source: state.source,
      rows: state.rows.filter((r) => known.has(r)),
      column: state.column && known.has(state.column) ? state.column : null,
      quantity,
      filters: Object.fromEntries(Object.entries(state.filters).filter(([k]) => known.has(k))),
    };
  }, [options, state, quantity]);
  const { result, resultError, loading } = useAnalysisResult(request);

  const rowLabels = (request?.rows ?? []).map(label);
  const valueLabel = state.source === "samples" ? "Samples" : AGGREGATION_LABELS[aggregation];
  const noun = state.source === "samples" ? "samples" : "traits";

  const exportCsv = () => {
    if (!result) return;
    const what = state.source === "samples" ? "samples" : `${quantity}_${aggregation}`;
    download(`summary_${what}_${new Date().toISOString().slice(0, 10)}.csv`, pivotToCsv(result, rowLabels, aggregation, valueLabel));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary tables</CardTitle>
        <CardDescription>
          Count samples, or summarise one trait type, by up to two row fields and one column field.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {optionsError && <p className="text-sm text-destructive">Could not load the fields to summarise.</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="source">Summarise</Label>
            <Select value={state.source} onValueChange={(v) => update({ source: v as Source })}>
              <SelectTrigger id="source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="samples">Samples (count)</SelectItem>
                <SelectItem value="traits">Trait values</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {state.source === "traits" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="quantity">Trait type</Label>
                <Select value={quantity} onValueChange={(v) => update({ quantity: v })}>
                  <SelectTrigger id="quantity">
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
              <div className="space-y-2">
                <Label htmlFor="aggregation">Show</Label>
                <Select value={aggregation} onValueChange={(v) => update({ aggregation: v as Aggregation })}>
                  <SelectTrigger id="aggregation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGGREGATIONS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {AGGREGATION_LABELS[a]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DimensionSelect
            id="rows"
            label="Rows"
            dimensions={dimensions}
            value={row1 ?? null}
            noneLabel="None"
            exclude={[row2, state.column].filter(Boolean) as string[]}
            onChange={(v) => update({ rows: v ? [v, ...(row2 ? [row2] : [])] : [] })}
          />
          <DimensionSelect
            id="rows-then"
            label="Then by"
            dimensions={dimensions}
            value={row2 ?? null}
            noneLabel="None"
            exclude={[row1, state.column].filter(Boolean) as string[]}
            onChange={(v) => update({ rows: [...(row1 ? [row1] : []), ...(v ? [v] : [])] })}
          />
          <DimensionSelect
            id="column"
            label="Columns"
            dimensions={dimensions}
            value={state.column}
            noneLabel="None"
            exclude={state.rows}
            onChange={(v) => update({ column: v })}
          />
        </div>

        <FilterBar dimensions={dimensions} filters={state.filters} onChange={(filters) => update({ filters })} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {result && (
              <Badge variant="outline">
                {result.metadata.matched} of {result.metadata.total} {noun}
              </Badge>
            )}
            {result?.unit && <Badge variant="secondary">{result.unit}</Badge>}
            {state.source === "traits" && quantityOption && !quantityOption.unit && (
              <span className="text-xs text-muted-foreground">
                No default unit set for this trait type.
                {quantityOption.units.length > 0 && ` Units found in the existing data: ${quantityOption.units.join(", ")}.`}{" "}
                To set a default unit, go to{" "}
                <Link href="/settings/types#traitquantities" className="underline underline-offset-2">
                  Settings → Trait types
                </Link>
                .
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="heatmap" checked={state.heatmap} onCheckedChange={(heatmap) => update({ heatmap })} />
              <Label htmlFor="heatmap">Shade by value</Label>
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!result}>
              <DownloadSimple className="mr-1 h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>

        {resultError ? (
          <p className="text-sm text-destructive">Could not run the summary.</p>
        ) : !result || (loading && !result) ? (
          state.source === "traits" && options && !quantity ? (
            <p className="text-sm text-muted-foreground">There are no traits in this NEST yet.</p>
          ) : (
            <Skeleton className="h-48 w-full" />
          )
        ) : result.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing matches these filters.</p>
        ) : (
          <SummaryTable
            result={result}
            rowLabels={rowLabels}
            aggregation={aggregation}
            valueLabel={valueLabel}
            heatmap={state.heatmap}
          />
        )}

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="link" className="h-auto p-0 text-sm">
              Building the table in Excel or LibreOffice instead
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 text-sm text-muted-foreground">
            <p>
              Export the samples or traits table to xlsx from its page (for example{" "}
              <Link href="/samples/general" className="underline">
                all samples
              </Link>
              ), open it, select the data including the header row, then insert a PivotTable (Excel: Insert, PivotTable;
              LibreOffice Calc: Data, Pivot Table, Insert or Edit) and drag fields into rows, columns and values.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export default function SummaryTablesPage() {
  return (
    <div className="container px-4 py-6 md:px-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <SummaryTablesContent />
      </Suspense>
    </div>
  );
}

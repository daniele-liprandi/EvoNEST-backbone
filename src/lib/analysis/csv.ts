import type { PivotResult } from "./pivot";
import { formatStat, type Aggregation } from "./stats";

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** The last line holds the column totals. */
export function pivotToCsv(
  result: PivotResult,
  rowLabels: string[],
  aggregation: Aggregation,
  valueLabel: string,
): string {
  const hasColumns = result.columns.length > 0;
  const header = [...rowLabels, ...(hasColumns ? [...result.columns, "Total"] : [valueLabel])];
  const lines = [header];
  const fmt = (s: { [k in Aggregation]: number | null } | undefined) =>
    s ? formatStat(s[aggregation], aggregation) : "";
  for (const row of result.rows) {
    lines.push([
      ...row.key,
      ...(hasColumns ? [...result.columns.map((c) => fmt(row.cells[c])), fmt(row.total)] : [fmt(row.total)]),
    ]);
  }
  lines.push([
    ...(rowLabels.length ? ["Total", ...rowLabels.slice(1).map(() => "")] : []),
    ...(hasColumns ? [...result.columns.map((c) => fmt(result.columnTotals[c])), fmt(result.total)] : [fmt(result.total)]),
  ]);
  return lines.map((line) => line.map(cell).join(",")).join("\n") + "\n";
}

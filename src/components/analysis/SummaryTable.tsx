import type { AnalysisResult } from "@/hooks/useAnalysis";
import { formatStat, type Aggregation, type Summary } from "@/lib/analysis/stats";
import { cn } from "@/lib/utils";

/**
 * The pivoted table: row dimensions down the side, column values across, row
 * and column totals. Empty cells are blank, not 0. The heatmap shades body
 * cells (not totals) on the theme's primary colour.
 */
export function SummaryTable({
  result,
  rowLabels,
  aggregation,
  valueLabel,
  heatmap,
}: {
  result: AnalysisResult;
  rowLabels: string[];
  aggregation: Aggregation;
  valueLabel: string;
  heatmap: boolean;
}) {
  const hasColumns = result.columns.length > 0;
  const bodyValues = result.rows.flatMap((r) =>
    (hasColumns ? Object.values(r.cells) : [r.total])
      .map((s) => s[aggregation])
      .filter((v): v is number => typeof v === "number"),
  );
  const lo = Math.min(...bodyValues);
  const hi = Math.max(...bodyValues);
  const shade = (s: Summary | undefined) => {
    const v = s?.[aggregation];
    if (!heatmap || typeof v !== "number" || !Number.isFinite(lo) || hi === lo) return undefined;
    return { backgroundColor: `hsl(var(--primary) / ${(0.08 + 0.5 * ((v - lo) / (hi - lo))).toFixed(3)})` };
  };
  const td = "px-3 py-1.5 text-right tabular-nums whitespace-nowrap";
  const th = "px-3 py-1.5 text-left font-medium whitespace-nowrap";

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            {rowLabels.map((l) => (
              <th key={l} scope="col" className={th}>
                {l}
              </th>
            ))}
            {hasColumns ? (
              <>
                {result.columns.map((c) => (
                  <th key={c} scope="col" className={cn(th, "text-right")}>
                    {c}
                  </th>
                ))}
                <th scope="col" className={cn(th, "text-right")}>
                  Total
                </th>
              </>
            ) : (
              <th scope="col" className={cn(th, "text-right")}>
                {valueLabel}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr key={row.key.join("\u0000")} className="border-b last:border-0">
              {row.key.map((k, i) => (
                <th key={i} scope="row" className={cn(th, "font-normal")}>
                  {k}
                </th>
              ))}
              {hasColumns ? (
                <>
                  {result.columns.map((c) => (
                    <td key={c} className={td} style={shade(row.cells[c])}>
                      {formatStat(row.cells[c]?.[aggregation], aggregation)}
                    </td>
                  ))}
                  <td className={cn(td, "font-medium")}>{formatStat(row.total[aggregation], aggregation)}</td>
                </>
              ) : (
                <td className={td} style={shade(row.total)}>
                  {formatStat(row.total[aggregation], aggregation)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t bg-muted/50 font-medium">
          <tr>
            {rowLabels.length > 0 && (
              <th scope="row" colSpan={rowLabels.length} className={th}>
                Total
              </th>
            )}
            {hasColumns &&
              result.columns.map((c) => (
                <td key={c} className={td}>
                  {formatStat(result.columnTotals[c]?.[aggregation], aggregation)}
                </td>
              ))}
            <td className={td}>{formatStat(result.total[aggregation], aggregation)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

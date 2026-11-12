// Summary statistics shared by every analysis view, so Trait statistics and
// Summary tables report the same numbers for the same grouping.

export const AGGREGATIONS = ["n", "mean", "sd", "min", "max", "median"] as const;
export type Aggregation = (typeof AGGREGATIONS)[number];

export const AGGREGATION_LABELS: Record<Aggregation, string> = {
  n: "Count",
  mean: "Mean",
  sd: "Standard deviation",
  min: "Min",
  max: "Max",
  median: "Median",
};

export type Summary = Record<Aggregation, number | null>;

/**
 * `n` counts the records in the group; the value statistics use the numeric
 * values among them. `sd` is the sample standard deviation (n - 1), so a group
 * of one has none.
 */
export function summarise(count: number, values: number[]): Summary {
  const valid = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (valid.length === 0) {
    return { n: count, mean: null, sd: null, min: null, max: null, median: null };
  }
  const sorted = [...valid].sort((a, b) => a - b);
  const k = sorted.length;
  const mean = sorted.reduce((acc, v) => acc + v, 0) / k;
  const sd = k > 1 ? Math.sqrt(sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (k - 1)) : null;
  const median = k % 2 === 0 ? (sorted[k / 2 - 1] + sorted[k / 2]) / 2 : sorted[(k - 1) / 2];
  return { n: count, mean, sd, min: sorted[0], max: sorted[k - 1], median };
}

/** Four significant figures, without trailing zeros; blank for no value. */
export function formatStat(value: number | null | undefined, aggregation: Aggregation): string {
  if (value === null || value === undefined) return "";
  if (aggregation === "n") return String(value);
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e6 || abs < 1e-3) return value.toExponential(3).replace(/\.?0+e/, "e");
  return String(Number(value.toPrecision(4)));
}

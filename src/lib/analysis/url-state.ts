import type { Aggregation } from "./stats";

export type Source = "samples" | "traits";

export type AnalysisUrlState = {
  source: Source;
  quantity: string;
  rows: string[];
  column: string | null;
  aggregation: Aggregation;
  heatmap: boolean;
  filters: Record<string, string[]>;
};

const FILTER_PREFIX = "f.";
// Filter values may contain commas (a free-text field); "|" is rarer.
const SEP = "|";

export function parseAnalysisState(params: URLSearchParams, defaults: Partial<AnalysisUrlState> = {}): AnalysisUrlState {
  const filters: Record<string, string[]> = {};
  params.forEach((value, key) => {
    // An empty filter is kept: the chip stays on screen until values are ticked.
    if (key.startsWith(FILTER_PREFIX)) filters[key.slice(FILTER_PREFIX.length)] = value ? value.split(SEP) : [];
  });
  const rows = params.get("rows");
  return {
    source: (params.get("source") as Source) || defaults.source || "traits",
    quantity: params.get("q") ?? defaults.quantity ?? "",
    rows: rows !== null ? rows.split(",").filter(Boolean) : defaults.rows ?? [],
    column: params.get("col") || defaults.column || null,
    aggregation: (params.get("agg") as Aggregation) || defaults.aggregation || "mean",
    heatmap: params.has("heat") ? params.get("heat") === "1" : defaults.heatmap ?? false,
    filters,
  };
}

export function serialiseAnalysisState(state: Partial<AnalysisUrlState>): string {
  const params = new URLSearchParams();
  if (state.source) params.set("source", state.source);
  if (state.quantity) params.set("q", state.quantity);
  if (state.rows) params.set("rows", state.rows.join(","));
  if (state.column) params.set("col", state.column);
  if (state.aggregation) params.set("agg", state.aggregation);
  if (state.heatmap !== undefined) params.set("heat", state.heatmap ? "1" : "0");
  for (const [dim, values] of Object.entries(state.filters ?? {})) {
    params.set(`${FILTER_PREFIX}${dim}`, values.join(SEP));
  }
  return params.toString();
}


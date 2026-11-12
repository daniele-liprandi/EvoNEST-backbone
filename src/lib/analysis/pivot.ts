import { summarise, type Summary } from "./stats";

/** Shown, sorted last, and filtered on, for a record with no value for a dimension. */
export const NOT_RECORDED = "Not recorded";

export type AnalysisRecord = {
  dims: Record<string, string | null>;
  value: number | null;
};

export type PivotRow = { key: string[]; cells: Record<string, Summary>; total: Summary };

export type PivotResult = {
  rows: PivotRow[];
  columns: string[];
  columnTotals: Record<string, Summary>;
  total: Summary;
};

const label = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? NOT_RECORDED : v);

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const compareKeys = (a: string, b: string) =>
  a === b ? 0 : a === NOT_RECORDED ? 1 : b === NOT_RECORDED ? -1 : collator.compare(a, b);

/** Keep records whose value for each filtered dimension is one of the allowed values. */
export function applyFilters(records: AnalysisRecord[], filters: Record<string, string[]>): AnalysisRecord[] {
  const active = Object.entries(filters).filter(([, allowed]) => allowed.length > 0);
  if (active.length === 0) return records;
  return records.filter((r) => active.every(([dim, allowed]) => allowed.includes(label(r.dims[dim]))));
}

type Bucket = { count: number; values: number[] };
const bucket = (): Bucket => ({ count: 0, values: [] });
const add = (b: Bucket, r: AnalysisRecord) => {
  b.count += 1;
  if (r.value !== null) b.values.push(r.value);
};
const done = (b: Bucket) => summarise(b.count, b.values);

/**
 * Cross-tabulate records: one row per combination of the `rows` dimensions,
 * one column per value of `column` (or none), with row, column and grand totals.
 */
export function pivot(records: AnalysisRecord[], rows: string[], column: string | null): PivotResult {
  const rowBuckets = new Map<string, { key: string[]; cells: Map<string, Bucket>; total: Bucket }>();
  const columnBuckets = new Map<string, Bucket>();
  const total = bucket();

  for (const r of records) {
    const key = rows.map((d) => label(r.dims[d]));
    const id = JSON.stringify(key);
    let row = rowBuckets.get(id);
    if (!row) {
      row = { key, cells: new Map(), total: bucket() };
      rowBuckets.set(id, row);
    }
    add(row.total, r);
    add(total, r);
    if (column) {
      const col = label(r.dims[column]);
      if (!row.cells.has(col)) row.cells.set(col, bucket());
      add(row.cells.get(col)!, r);
      if (!columnBuckets.has(col)) columnBuckets.set(col, bucket());
      add(columnBuckets.get(col)!, r);
    }
  }

  const columns = [...columnBuckets.keys()].sort(compareKeys);
  const sortedRows = [...rowBuckets.values()].sort((a, b) => {
    for (let i = 0; i < a.key.length; i++) {
      const c = compareKeys(a.key[i], b.key[i]);
      if (c !== 0) return c;
    }
    return 0;
  });

  return {
    rows: sortedRows.map((row) => ({
      key: row.key,
      cells: Object.fromEntries([...row.cells].map(([c, b]) => [c, done(b)])),
      total: done(row.total),
    })),
    columns,
    columnTotals: Object.fromEntries([...columnBuckets].map(([c, b]) => [c, done(b)])),
    total: done(total),
  };
}

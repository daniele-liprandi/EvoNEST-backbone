import { applyFilters, NOT_RECORDED, pivot, type AnalysisRecord } from "@/lib/analysis/pivot";
import { formatStat, summarise } from "@/lib/analysis/stats";
import { pivotToCsv } from "@/lib/analysis/csv";
import { parseAnalysisState, serialiseAnalysisState, type AnalysisUrlState } from "@/lib/analysis/url-state";

const rec = (dims: Record<string, string | null>, value: number | null = null): AnalysisRecord => ({ dims, value });

describe("summarise", () => {
  test("mean, sample sd, min, max, median", () => {
    expect(summarise(4, [2, 4, 4, 6])).toEqual({ n: 4, mean: 4, sd: Math.sqrt(8 / 3), min: 2, max: 6, median: 4 });
  });
  test("odd count median; one value has no sd", () => {
    expect(summarise(3, [5, 1, 3]).median).toBe(3);
    expect(summarise(1, [7])).toMatchObject({ n: 1, mean: 7, sd: null });
  });
  test("counts without values (samples) only fill n", () => {
    expect(summarise(5, [])).toEqual({ n: 5, mean: null, sd: null, min: null, max: null, median: null });
  });
});

describe("formatStat", () => {
  test("four significant figures, exponent for very large or small", () => {
    expect(formatStat(3.14159, "mean")).toBe("3.142");
    expect(formatStat(9581000000, "mean")).toBe("9.581e+9");
    expect(formatStat(0.00086926, "mean")).toBe("8.693e-4");
    expect(formatStat(2, "mean")).toBe("2");
    expect(formatStat(null, "mean")).toBe("");
    expect(formatStat(12, "n")).toBe("12");
  });
});

describe("pivot", () => {
  const records = [
    rec({ type: "animal", sex: "female" }, 1),
    rec({ type: "animal", sex: "male" }, 3),
    rec({ type: "animal", sex: "female" }, 5),
    rec({ type: "silk", sex: null }, 7),
  ];

  test("rows only", () => {
    const out = pivot(records, ["type"], null);
    expect(out.columns).toEqual([]);
    expect(out.rows.map((r) => [r.key, r.total.n, r.total.mean])).toEqual([
      [["animal"], 3, 3],
      [["silk"], 1, 7],
    ]);
    expect(out.total).toMatchObject({ n: 4, mean: 4 });
  });

  test("rows by column, with totals and empty cells left out", () => {
    const out = pivot(records, ["type"], "sex");
    expect(out.columns).toEqual(["female", "male", NOT_RECORDED]);
    const silk = out.rows.find((r) => r.key[0] === "silk")!;
    expect(Object.keys(silk.cells)).toEqual([NOT_RECORDED]);
    expect(out.rows[0].cells.female).toMatchObject({ n: 2, mean: 3, min: 1, max: 5 });
    expect(out.columnTotals.female.n).toBe(2);
    expect(out.columnTotals[NOT_RECORDED].n).toBe(1);
  });

  test("two row dimensions sort by each in turn, Not recorded last", () => {
    const out = pivot([rec({ a: "y", b: "2" }), rec({ a: "x", b: null }), rec({ a: "x", b: "10" }), rec({ a: "x", b: "2" })], ["a", "b"], null);
    expect(out.rows.map((r) => r.key)).toEqual([["x", "2"], ["x", "10"], ["x", NOT_RECORDED], ["y", "2"]]);
  });

  test("no row dimensions is one row of everything", () => {
    const out = pivot(records, [], null);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0]).toMatchObject({ key: [], total: { n: 4 } });
  });
});

describe("applyFilters", () => {
  test("keeps records matching every filtered dimension; Not recorded is a value", () => {
    const records = [rec({ type: "animal", sex: "female" }), rec({ type: "silk", sex: null }), rec({ type: "animal", sex: "male" })];
    expect(applyFilters(records, { type: ["animal"], sex: ["female"] })).toHaveLength(1);
    expect(applyFilters(records, { sex: [NOT_RECORDED] })).toEqual([records[1]]);
    expect(applyFilters(records, { sex: [] })).toHaveLength(3);
  });
});

describe("pivotToCsv", () => {
  test("rows by column with totals, quoting and empty cells", () => {
    const out = pivot(
      [rec({ type: "animal", sex: "female" }, 1), rec({ type: "animal", sex: "male" }, 3), rec({ type: "silk, raw", sex: "female" }, 5)],
      ["type"],
      "sex",
    );
    expect(pivotToCsv(out, ["Sample type"], "mean", "Mean")).toBe(
      ["Sample type,female,male,Total", "animal,1,3,2", '"silk, raw",5,,5', "Total,3,3,3", ""].join("\n"),
    );
  });
  test("no column: one value column", () => {
    const out = pivot([rec({ type: "animal" }), rec({ type: "animal" })], ["type"], null);
    expect(pivotToCsv(out, ["Sample type"], "n", "Count")).toBe("Sample type,Count\nanimal,2\nTotal,2\n");
  });
});

describe("analysis URL state", () => {
  test("round-trips through the query string, filter values with commas included", () => {
    const state: AnalysisUrlState = {
      source: "traits",
      quantity: "youngs_modulus",
      rows: ["species", "subsampletype"],
      column: "year",
      aggregation: "median",
      heatmap: true,
      filters: { family: ["Araneidae"], location: ["Greifswald, DE", "Not recorded"], sex: [] },
    };
    expect(parseAnalysisState(new URLSearchParams(serialiseAnalysisState(state)))).toEqual(state);
  });
  test("defaults fill what the URL leaves out", () => {
    expect(parseAnalysisState(new URLSearchParams(""), { source: "samples", rows: ["type"] })).toMatchObject({
      source: "samples",
      rows: ["type"],
      column: null,
      aggregation: "mean",
      heatmap: false,
      filters: {},
    });
  });
});

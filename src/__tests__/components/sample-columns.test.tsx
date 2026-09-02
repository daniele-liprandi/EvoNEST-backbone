import {
  buildSampleColumns,
  SAMPLE_COLUMN_KEYS,
  COLUMN_WIDGET_KINDS,
  defaultColumnsForType,
} from "@/app/(nest)/samples/columns";
import { customColumn } from "@/components/tables/columns";

const keyOf = (col: any) => col.id ?? col.accessorKey;
const inner = (cols: any[]) => cols.slice(1, -1).map(keyOf);

describe("buildSampleColumns", () => {
  test("built-in keys resolve, wrapped in select + actions", () => {
    const cols = buildSampleColumns({ value: "plant", columns: ["name", "genus", "species", "location"] });
    expect(keyOf(cols[0])).toBe("select");
    expect(keyOf(cols.at(-1))).toBe("actions");
    expect(inner(cols)).toEqual(["name", "genus", "species", "location"]);
  });

  test("unknown keys are skipped", () => {
    const cols = buildSampleColumns({ value: "x", columns: ["name", "totallyMadeUp", "location"] });
    expect(inner(cols)).toEqual(["name", "location"]);
  });

  test("a column entry that names one of the type's fields renders that field", () => {
    const cols = buildSampleColumns({
      value: "crop",
      fields: [
        { key: "plot", label: "Plot", kind: "text" },
        { key: "stage", label: "Stage", kind: "select", options: [{ value: "a", label: "A" }] },
      ],
      columns: ["name", "plot", "stage"],
    });
    expect(inner(cols)).toEqual(["name", "plot", "stage"]);
  });

  test("a field key with no matching field definition is skipped", () => {
    const cols = buildSampleColumns({ value: "crop", fields: [], columns: ["name", "plot"] });
    expect(inner(cols)).toEqual(["name"]);
  });

  test("counter and progress widget objects are built via customColumn", () => {
    const cols = buildSampleColumns({
      value: "crop",
      columns: [
        "name",
        { key: "watered", label: "Watered", kind: "counter" },
        { key: "toHarvest", label: "To harvest", kind: "progress", field: "sownDate", days: 90 },
      ],
    });
    expect(inner(cols)).toEqual(["name", "watered", "sownDate"]);
  });

  test("an unconfigured type gets the generic default set", () => {
    const cols = buildSampleColumns({ value: "whatever" });
    expect(cols.map(keyOf)).toEqual(expect.arrayContaining(["name", "date", "type", "location"]));
    expect(cols.map(keyOf)).not.toEqual(expect.arrayContaining(["molted"]));
  });
});

describe("customColumn widgets", () => {
  test("counter uses the key as accessor", () => {
    expect(keyOf(customColumn({ key: "watered", label: "Watered", kind: "counter" }))).toBe("watered");
  });

  test("progress reads from `field` when given", () => {
    expect(keyOf(customColumn({ key: "dryness", label: "Dryness", kind: "progress", field: "lastWatered", days: 5 }))).toBe("lastWatered");
  });
});

describe("metadata", () => {
  test("exposes the palette keys and the widget kinds", () => {
    expect(SAMPLE_COLUMN_KEYS).toEqual(expect.arrayContaining(["name", "sex", "molted"]));
    expect(COLUMN_WIDGET_KINDS).toEqual(["counter", "progress"]);
  });

  test("defaultColumnsForType is a generic set, not type-specific", () => {
    expect(defaultColumnsForType("animal")).toEqual(defaultColumnsForType("plant"));
    expect(defaultColumnsForType("animal")).toContain("name");
  });
});

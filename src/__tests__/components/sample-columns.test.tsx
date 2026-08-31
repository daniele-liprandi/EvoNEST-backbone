import { buildSampleColumns, SAMPLE_COLUMN_KEYS, CUSTOM_COLUMN_KINDS, defaultColumnsForType } from "@/app/(nest)/samples/columns";
import { customColumn } from "@/components/tables/columns";

const keyOf = (col: any) => col.id ?? col.accessorKey;

describe("buildSampleColumns", () => {
  test("renders a type's built-in column list, wrapped in select + actions", () => {
    const cols = buildSampleColumns({ value: "plant", columns: ["name", "genus", "species", "location"] });
    expect(keyOf(cols[0])).toBe("select");
    expect(keyOf(cols.at(-1))).toBe("actions");
    expect(cols.slice(1, -1).map(keyOf)).toEqual(["name", "genus", "species", "location"]);
  });

  test("unknown built-in keys are skipped", () => {
    const cols = buildSampleColumns({ value: "x", columns: ["name", "totallyMadeUp", "location"] });
    expect(cols.slice(1, -1).map(keyOf)).toEqual(["name", "location"]);
  });

  test("a custom column object is built via customColumn", () => {
    const cols = buildSampleColumns({
      value: "crop",
      columns: ["name", { key: "growthStage", label: "Growth stage", kind: "toggle", options: [{ value: "seedling", label: "Seedling" }] }],
    });
    expect(cols.slice(1, -1).map(keyOf)).toEqual(["name", "growthStage"]);
  });

  test("falls back to the animal built-in layout when nothing is configured", () => {
    const cols = buildSampleColumns({ value: "animal" });
    const keys = cols.map(keyOf);
    expect(keys).toEqual(expect.arrayContaining(["sex", "lifestage", "molted", "eggsac"]));
  });

  test("an unconfigured, unknown type gets the generic default set", () => {
    const cols = buildSampleColumns({ value: "whatever" });
    expect(cols.map(keyOf)).not.toEqual(expect.arrayContaining(["molted"]));
    expect(cols.map(keyOf)).toEqual(expect.arrayContaining(["name", "date", "type", "location"]));
  });
});

describe("customColumn", () => {
  test("counter uses the key as accessor", () => {
    expect(keyOf(customColumn({ key: "watered", label: "Watered", kind: "counter" }))).toBe("watered");
  });

  test("progress reads from `field` when given", () => {
    expect(keyOf(customColumn({ key: "dryness", label: "Dryness", kind: "progress", field: "lastWatered", days: 5 }))).toBe("lastWatered");
  });

  test("text/number/date all produce a column for their key", () => {
    for (const kind of ["text", "number", "date"] as const) {
      expect(keyOf(customColumn({ key: `f_${kind}`, label: kind, kind }))).toBe(`f_${kind}`);
    }
  });

  test("exports the palette keys and the custom kinds", () => {
    expect(SAMPLE_COLUMN_KEYS).toEqual(expect.arrayContaining(["name", "sex", "molted"]));
    expect(CUSTOM_COLUMN_KINDS).toEqual(["counter", "toggle", "progress", "text", "number", "date"]);
  });
});

describe("defaultColumnsForType", () => {
  test("special-cased types get their own layout", () => {
    expect(defaultColumnsForType("animal")).toContain("eggsac");
    expect(defaultColumnsForType("subsample")).toContain("subsampletype");
  });

  test("any other type gets the generic set", () => {
    expect(defaultColumnsForType("plant")).toEqual(defaultColumnsForType("whatever"));
    expect(defaultColumnsForType("plant")).toContain("name");
  });

  test("every default key is a real built-in the editor offers", () => {
    for (const type of ["animal", "subsample", "plant"]) {
      for (const key of defaultColumnsForType(type)) {
        expect(SAMPLE_COLUMN_KEYS).toContain(key);
      }
    }
  });
});

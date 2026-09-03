import {
  buildSampleFields,
  buildEditFields,
  customFieldMap,
  customFieldKeys,
  defaultFieldsForType,
  fieldLabel,
  SAMPLE_FIELD_KEYS,
  CUSTOM_FIELD_KINDS,
} from "@/app/(nest)/samples/fields";

const keys = (list: any[]) => list.map((f) => f.key);

const crop = {
  value: "crop",
  fields: [
    "taxonomy",
    "responsible",
    { key: "plot", label: "Plot", kind: "text" },
    {
      key: "stage",
      label: "Growth stage",
      kind: "select",
      options: [{ value: "seedling", label: "Seedling" }],
    },
    { key: "sown", label: "Sown", kind: "date" },
  ],
};

describe("buildSampleFields", () => {
  test("renders the configured list in order, built-ins flagged", () => {
    const list = buildSampleFields({ value: "x", fields: ["responsible", "date", "location"] });
    expect(keys(list)).toEqual(["responsible", "date", "location"]);
    expect(list.every((f) => f.builtin)).toBe(true);
  });

  test("unknown and always-shown keys are dropped", () => {
    const list = buildSampleFields({
      value: "x",
      fields: ["responsible", "madeUp", "name", "notes", "date"],
    });
    expect(keys(list)).toEqual(["responsible", "date"]);
  });

  test("custom fields pass through with kind and options", () => {
    const list = buildSampleFields(crop);
    expect(keys(list)).toEqual(["taxonomy", "responsible", "plot", "stage", "sown"]);
    expect(list[3]).toMatchObject({ builtin: false, kind: "select" });
  });

  test("a custom field with an unsupported kind is dropped", () => {
    expect(buildSampleFields({ value: "x", fields: [{ key: "a", label: "A", kind: "wysiwyg" }] })).toEqual([]);
  });

  test("a type with no fields list gets the generic default", () => {
    expect(keys(buildSampleFields({ value: "animal" }))).toEqual(defaultFieldsForType());
    expect(keys(buildSampleFields("whatever"))).toEqual(defaultFieldsForType());
  });
});

describe("buildEditFields", () => {
  test("name, taxonomy and notes always, parent never", () => {
    const list = buildEditFields(crop);
    expect(list[0]).toEqual({ key: "name", label: "Name", type: "text" });
    expect(list.at(-1)).toEqual({ key: "notes", label: "Notes", type: "textarea" });
    // family/genus/species are editable so a mis-identified sample can be fixed
    // (and its name regenerated); the composite `taxonomy` and `parent` are not.
    expect(keys(list)).toEqual(expect.arrayContaining(["family", "genus", "species"]));
    expect(keys(list)).not.toContain("taxonomy");
    expect(keys(list)).not.toContain("parent");
  });

  test("editable built-ins and every custom field come through with a type", () => {
    const list = buildEditFields(crop);
    expect(keys(list)).toEqual(["name", "family", "genus", "species", "plot", "stage", "sown", "notes"]);
    expect(list.find((f) => f.key === "stage")).toMatchObject({ type: "select", options: expect.any(Array) });
    expect(list.find((f) => f.key === "sown")).toMatchObject({ type: "date" });
  });

  test("responsible is create-only, box/slot/date/location/sex are editable", () => {
    const list = buildEditFields({
      value: "x",
      fields: ["responsible", "date", "location", "sex", "box", "slot"],
    });
    expect(keys(list)).toEqual([
      "name", "family", "genus", "species", "date", "location", "sex", "box", "slot", "notes",
    ]);
  });
});

describe("customFieldMap / customFieldKeys", () => {
  test("maps custom keys to descriptors, ignores built-ins", () => {
    const map = customFieldMap(crop);
    expect(Object.keys(map)).toEqual(["plot", "stage", "sown"]);
    expect(map.stage).toMatchObject({ kind: "select", label: "Growth stage" });
    expect(customFieldKeys(crop)).toEqual(["plot", "stage", "sown"]);
  });

  test("a type with no fields list has none", () => {
    expect(customFieldKeys({ value: "animal" })).toEqual([]);
  });
});

describe("metadata", () => {
  test("exposes the palette and the custom kinds", () => {
    expect(SAMPLE_FIELD_KEYS).toEqual(expect.arrayContaining(["taxonomy", "location", "sex"]));
    expect(CUSTOM_FIELD_KINDS).toEqual(["text", "number", "date", "select", "textarea"]);
  });

  test("fieldLabel matches the form wording", () => {
    expect(fieldLabel("subsampletype")).toBe("Subsample type");
    expect(fieldLabel("date")).toBe("Date of collection");
  });
});

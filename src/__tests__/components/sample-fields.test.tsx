import {
  buildSampleFields,
  customFieldKeys,
  defaultFieldsForType,
  fieldLabel,
  SAMPLE_FIELD_KEYS,
  CUSTOM_FIELD_KINDS,
} from "@/app/(nest)/samples/fields";

const keys = (list: any[]) => list.map((f) => f.key);

describe("buildSampleFields", () => {
  test("renders a type's configured built-in list, in order", () => {
    const list = buildSampleFields({
      value: "plant",
      fields: ["responsible", "date", "location"],
    });
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

  test("a custom field object is passed through with its kind and options", () => {
    const list = buildSampleFields({
      value: "crop",
      fields: [
        "responsible",
        {
          key: "growthStage",
          label: "Growth stage",
          kind: "select",
          options: [{ value: "seedling", label: "Seedling" }],
        },
      ],
    });
    expect(keys(list)).toEqual(["responsible", "growthStage"]);
    expect(list[1]).toMatchObject({
      builtin: false,
      kind: "select",
      options: [{ value: "seedling", label: "Seedling" }],
    });
  });

  test("a custom field with an unsupported kind is dropped", () => {
    const list = buildSampleFields({
      value: "crop",
      fields: [{ key: "x", label: "X", kind: "wysiwyg" }],
    });
    expect(list).toEqual([]);
  });

  test("falls back to the animal layout when nothing is configured", () => {
    expect(keys(buildSampleFields({ value: "animal" }))).toEqual(
      defaultFieldsForType("animal"),
    );
    expect(keys(buildSampleFields("animal"))).toContain("taxonomy");
    expect(keys(buildSampleFields("animal"))).toContain("sex");
  });

  test("an unconfigured unknown type gets the generic default set", () => {
    expect(keys(buildSampleFields("whatever"))).toEqual(
      defaultFieldsForType("whatever"),
    );
    expect(keys(buildSampleFields("whatever"))).not.toContain("sex");
  });
});

describe("defaultFieldsForType", () => {
  test("special-cased types keep their own layout", () => {
    expect(defaultFieldsForType("subsample")).toContain("subsampletype");
    expect(defaultFieldsForType("animal")).toContain("sex");
  });

  test("every default key is a real built-in the form knows", () => {
    for (const type of ["animal", "subsample", "plant"]) {
      for (const key of defaultFieldsForType(type)) {
        expect(SAMPLE_FIELD_KEYS).toContain(key);
      }
    }
  });
});

describe("customFieldKeys", () => {
  test("lists only the custom entries", () => {
    expect(
      customFieldKeys({
        value: "crop",
        fields: ["responsible", { key: "plot", label: "Plot", kind: "text" }],
      }),
    ).toEqual(["plot"]);
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

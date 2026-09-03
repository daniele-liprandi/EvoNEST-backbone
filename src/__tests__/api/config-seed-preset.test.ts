/** @jest-environment node */

// The /api/config/types/seed route is on the Effect line — its preset / lab-name
// behaviour is covered by app.api.config.seed.test.ts. This file covers the
// preset data itself: resolvePreset and the shape of every LAB_PRESETS entry.

import { resolvePreset, LAB_PRESETS } from "@/shared/config/lab-presets";

describe("resolvePreset", () => {
  test("merges the override onto the defaults", () => {
    const resolved = resolvePreset("arthropod-husbandry");
    expect(resolved?.sampletypes.some((s: any) => s.value === "animal")).toBe(true);
    expect(resolved?.equipmenttypes.length).toBeGreaterThan(0);
    expect(resolvePreset("nope")).toBeNull();
  });

  test("the crop field-trial preset carries a growth-stage field, watered counter and yield trait", () => {
    const resolved = resolvePreset("crop-field-trial");
    const crop = resolved?.sampletypes.find((s: any) => s.value === "crop") as any;
    expect(crop.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "growthStage", kind: "select" })]),
    );
    expect(crop.columns).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "watered", kind: "counter" })]),
    );
    expect(crop.columns).toContain("growthStage");
    expect(resolved?.traittypes.map((t: any) => t.value)).toContain("yield");
  });

  test.each([
    ["herbarium", "herbarium", "phenology"],
    ["museum-specimens", "specimen", "preparation"],
    ["sequencing-pipeline", "seqsample", "qc"],
    ["microbial-culture", "strain", "contamination"],
  ])("the %s preset defines %s's %s as a field, referenced from columns", (preset, typeValue, customKey) => {
    const resolved = resolvePreset(preset);
    const type = resolved?.sampletypes.find((s: any) => s.value === typeValue) as any;
    expect(type).toBeTruthy();
    expect(type.fields.some((f: any) => typeof f === "object" && f.key === customKey)).toBe(true);
    expect(type.columns).toContain(customKey);
  });
});

const WIDGET_KINDS = ["counter", "progress"];

describe("preset sample-column lists", () => {
  const columnEntries = LAB_PRESETS.flatMap((p) =>
    (p.overrides.sampletypes ?? []).flatMap((t: any) => t.columns ?? []),
  );

  test("a custom column object is a counter or progress widget, well formed", () => {
    for (const entry of columnEntries) {
      if (typeof entry === "string") continue;
      expect(entry.key).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(WIDGET_KINDS).toContain(entry.kind);
      if (entry.kind === "progress") expect(entry.field ?? entry.key).toBeTruthy();
    }
  });

  test("every non-built-in column key names one of the type's fields", () => {
    const BUILTIN = new Set([
      "name", "responsible", "recentChange", "date", "type", "parent", "location",
      "box", "slot", "family", "genus", "species", "subsampletype", "sex",
      "lifestage", "lifestatus", "hungry", "fed", "molted", "eggsac",
    ]);
    for (const p of LAB_PRESETS) {
      for (const t of p.overrides.sampletypes ?? []) {
        const fieldKeys = new Set((t.fields ?? []).map((f: any) => (typeof f === "string" ? f : f.key)));
        for (const col of t.columns ?? []) {
          if (typeof col !== "string" || BUILTIN.has(col)) continue;
          expect(fieldKeys.has(col)).toBe(true);
        }
      }
    }
  });
});

const FIELD_KINDS = ["text", "number", "date", "select", "textarea"];

describe("preset create-form field lists", () => {
  const sampleTypes = LAB_PRESETS.flatMap((p) => p.overrides.sampletypes ?? []);

  test("every custom field entry is well formed", () => {
    for (const type of sampleTypes) {
      for (const entry of type.fields ?? []) {
        if (typeof entry === "string") continue;
        expect(entry.key).toBeTruthy();
        expect(entry.label).toBeTruthy();
        expect(FIELD_KINDS).toContain(entry.kind);
        if (entry.kind === "select") expect(Array.isArray(entry.options)).toBe(true);
      }
    }
  });

  test("the crop preset asks for plot, treatment and growth stage at creation", () => {
    const crop = resolvePreset("crop-field-trial")?.sampletypes.find((s: any) => s.value === "crop") as any;
    const keys = crop.fields.map((f: any) => (typeof f === "string" ? f : f.key));
    expect(keys).toEqual(expect.arrayContaining(["taxonomy", "plot", "treatment", "growthStage"]));
    expect(crop.fields.find((f: any) => f.key === "growthStage").kind).toBe("select");
    expect(keys).not.toContain("watered");
    expect(keys).not.toContain("maturity");
  });
});

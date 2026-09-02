/** @jest-environment node */

jest.mock("@/app/api/utils/mongodbClient", () => ({ get_or_create_client: jest.fn() }));
jest.mock("@/app/api/utils/get_database_user", () => ({
  get_database_user: jest.fn().mockResolvedValue("labdb"),
  get_name_authuser: jest.fn().mockResolvedValue("tester"),
}));
jest.mock("@/app/api/utils/permissions", () => ({ userCan: jest.fn() }));

import { POST } from "@/app/api/config/types/seed/route";
import { resolvePreset, LAB_PRESETS } from "@/shared/config/lab-presets";

const { get_or_create_client } = require("@/app/api/utils/mongodbClient");
const { userCan } = require("@/app/api/utils/permissions");

const replaceOne = jest.fn().mockResolvedValue({ upsertedCount: 1 });
const updateOne = jest.fn().mockResolvedValue({});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  userCan.mockResolvedValue(true);
  get_or_create_client.mockResolvedValue({
    db: () => ({ collection: () => ({ replaceOne, updateOne }) }),
  });
});

const body = (obj: unknown) =>
  new Request("http://x/api/config/types/seed", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(obj),
  });

describe("config/types/seed with presets", () => {
  test("no body seeds every default config type", async () => {
    const res = await POST(new Request("http://x/api/config/types/seed", { method: "POST" }));
    expect(res.status).toBe(200);
    const seededTypes = replaceOne.mock.calls.map((c) => c[0].type);
    expect(seededTypes).toEqual(expect.arrayContaining(["sampletypes", "traittypes", "baseunits"]));
  });

  test("a preset overrides the types it names and keeps the rest", async () => {
    const res = await POST(body({ preset: "silk-biomechanics" }));
    expect(res.status).toBe(200);
    const byType = Object.fromEntries(replaceOne.mock.calls.map((c) => [c[0].type, c[1].data]));
    expect(byType.sampletypes.map((s: any) => s.value)).toContain("silk");
    expect(byType.traittypes.map((t: any) => t.value)).toContain("tensile_strength");
    // siprefixes not named by the preset -> still the default
    expect(byType.siprefixes.length).toBeGreaterThan(0);
  });

  test("an unknown preset is a 400", async () => {
    const res = await POST(body({ preset: "does-not-exist" }));
    expect(res.status).toBe(400);
    expect(replaceOne).not.toHaveBeenCalled();
  });

  test("a non-admin is refused", async () => {
    userCan.mockResolvedValue(false);
    const res = await POST(body({ preset: "generic" }));
    expect(res.status).toBe(403);
  });

  test("the lab name and description are written to the main settings", async () => {
    await POST(body({ preset: "generic", labName: "Silk Lab", labDescription: "we study spider silk" }));
    expect(updateOne).toHaveBeenCalledWith(
      { type: "main" },
      { $set: { type: "main", "labInfo.name": "Silk Lab", "labInfo.description": "we study spider silk" } },
      { upsert: true },
    );
  });

  test("no settings write when the lab fields are absent", async () => {
    await POST(body({ preset: "generic" }));
    expect(updateOne).not.toHaveBeenCalled();
  });

  test("resolvePreset merges the override onto the defaults", () => {
    const resolved = resolvePreset("arthropod-husbandry");
    expect(resolved?.sampletypes.some((s: any) => s.value === "animal")).toBe(true);
    expect(resolved?.equipmenttypes.length).toBeGreaterThan(0);
    expect(resolvePreset("nope")).toBeNull();
  });

  test("the crop field-trial preset carries a growth-stage field, watered counter and yield trait", () => {
    const resolved = resolvePreset("crop-field-trial");
    const crop = resolved?.sampletypes.find((s: any) => s.value === "crop");
    expect(crop.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "growthStage", kind: "select" }),
    ]));
    expect(crop.columns).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "watered", kind: "counter" }),
    ]));
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
    const type = resolved?.sampletypes.find((s: any) => s.value === typeValue);
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
    const crop = resolvePreset("crop-field-trial")?.sampletypes.find(
      (s: any) => s.value === "crop",
    );
    const keys = crop.fields.map((f: any) => (typeof f === "string" ? f : f.key));
    expect(keys).toEqual(expect.arrayContaining(["taxonomy", "plot", "treatment", "growthStage"]));
    // the growth-stage toggle column becomes a select field
    expect(crop.fields.find((f: any) => f.key === "growthStage").kind).toBe("select");
    // counters and progress bars are not entered at creation
    expect(keys).not.toContain("watered");
    expect(keys).not.toContain("maturity");
  });
});

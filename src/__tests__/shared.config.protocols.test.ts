import { STARTER_PROTOCOLS, validateProtocols } from "@/shared/config/protocols";
import { DEFAULT_CONFIGS } from "@/shared/config/default-types";
import { LAB_PRESETS, resolvePreset } from "@/shared/config/lab-presets";

const TECHNIQUES = ["tensile_test", "tabular_data"];
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe("validateProtocols", () => {
  test("the starter templates, the defaults and every preset are valid", () => {
    expect(validateProtocols(Object.values(STARTER_PROTOCOLS), TECHNIQUES)).toEqual([]);
    expect(validateProtocols(DEFAULT_CONFIGS.protocols, TECHNIQUES)).toEqual([]);
    for (const preset of LAB_PRESETS) {
      expect(validateProtocols(resolvePreset(preset.value)!.protocols, TECHNIQUES)).toEqual([]);
    }
  });

  test("reports each problem with where it is", () => {
    const bad = clone(STARTER_PROTOCOLS.tensile_campaign) as any;
    bad.steps[0].kind = "observation";
    bad.steps[1].repeatAs = "aliquot";
    bad.steps[2].technique = "x_ray";
    bad.steps.push({ ...bad.steps[2], technique: "tensile_test" });
    expect(validateProtocols([bad], TECHNIQUES)).toEqual([
      'Protocol "Tensile test campaign", step 1: kind must be procedure or measurement',
      'Protocol "Tensile test campaign", step 2: repeatAs must be subsample or label',
      'Protocol "Tensile test campaign", step 3: unknown technique "x_ray"',
      'Protocol "Tensile test campaign": step keys must be unique',
    ]);
  });

  test("a protocol needs a snake_case value and at least one step; values are unique", () => {
    const a = { value: "Bad Value", label: "Bad", appliesToSampleTypes: [], steps: [] };
    const b = clone(STARTER_PROTOCOLS.single_measurement);
    expect(validateProtocols([a, b, b], TECHNIQUES)).toEqual([
      'Protocol "Bad": value must be snake_case',
      'Protocol "Bad": needs at least one step',
      "Protocol values must be unique",
    ]);
  });

  test("a select param needs options; repeatAs only on repeatable steps", () => {
    const p = clone(STARTER_PROTOCOLS.husbandry_check) as any;
    p.steps[1].params[0].options = [];
    p.steps[0].repeatAs = "label";
    expect(validateProtocols([p], TECHNIQUES)).toEqual([
      'Protocol "Husbandry check", step 1: repeatAs is only for repeatable steps',
      'Protocol "Husbandry check", step 2, param 1: a select needs options with value and label',
    ]);
  });

  test("an unnamed step reports only the missing label", () => {
    const p = clone(STARTER_PROTOCOLS.single_measurement) as any;
    p.steps.push({ ...p.steps[0], key: "", label: "" });
    expect(validateProtocols([p], TECHNIQUES)).toEqual(['Protocol "Single measurement", step 2: label is required']);
  });
});

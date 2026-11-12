// Protocol templates: the `protocols` config type. A protocol experiment
// (stage 5 of #202) follows one of these.

export const STEP_KINDS = ["procedure", "measurement"];
export const REPEAT_AS = ["subsample", "label"];
// Same kinds as sample custom fields (samples/fields.js)
export const PARAM_KINDS = ["text", "number", "date", "select", "textarea"];

const step = (key, label, kind, extra = {}) => ({
  key,
  label,
  kind,
  params: [],
  equipmentTypes: [],
  optional: false,
  repeatable: false,
  ...(kind === "measurement" ? { technique: null, expectedQuantities: [] } : {}),
  ...extra,
});

export const STARTER_PROTOCOLS = {
  single_measurement: {
    value: "single_measurement",
    label: "Single measurement",
    appliesToSampleTypes: [],
    steps: [step("measure", "Measure", "measurement")],
  },
  tensile_campaign: {
    value: "tensile_campaign",
    label: "Tensile test campaign",
    appliesToSampleTypes: ["silk"],
    steps: [
      step("collect", "Collect silk", "procedure", {
        params: [
          {
            key: "method",
            label: "Collection method",
            kind: "select",
            options: [
              { value: "forced", label: "Forced silking" },
              { value: "natural", label: "Natural spinning" },
            ],
          },
          { key: "speed", label: "Reeling speed (mm/s)", kind: "number" },
        ],
      }),
      step("diameter", "Measure diameter", "measurement", {
        equipmentTypes: ["optical_microscope"],
        expectedQuantities: ["fiber_diameter"],
        repeatable: true,
        repeatAs: "subsample",
      }),
      step("tensile", "Tensile test", "measurement", {
        technique: "tensile_test",
        expectedQuantities: ["youngs_modulus", "tensile_strength", "strain_at_break", "toughness"],
        repeatable: true,
        repeatAs: "subsample",
      }),
    ],
  },
  husbandry_check: {
    value: "husbandry_check",
    label: "Husbandry check",
    appliesToSampleTypes: ["animal"],
    steps: [
      step("feed", "Feed", "procedure", {
        params: [{ key: "food", label: "Food", kind: "text" }],
      }),
      step("moult", "Check moult", "procedure", {
        params: [
          {
            key: "moulted",
            label: "Moulted",
            kind: "select",
            options: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ],
          },
        ],
      }),
      step("weigh", "Weigh", "measurement", { expectedQuantities: ["mass"], optional: true }),
    ],
  },
};

const isString = (v) => typeof v === "string";
const isKey = (v) => isString(v) && /^[a-z][a-z0-9_]*$/.test(v);
const isStringArray = (v) => Array.isArray(v) && v.every(isString);

function paramErrors(param, where) {
  const errors = [];
  if (!param || typeof param !== "object") return [`${where}: not an object`];
  if (!isString(param.label) || !param.label.trim()) errors.push(`${where}: label is required`);
  else if (!isKey(param.key)) errors.push(`${where}: key must be snake_case`);
  if (!PARAM_KINDS.includes(param.kind)) errors.push(`${where}: kind must be one of ${PARAM_KINDS.join(", ")}`);
  if (param.kind === "select") {
    const ok =
      Array.isArray(param.options) &&
      param.options.length > 0 &&
      param.options.every((o) => o && isString(o.value) && isString(o.label));
    if (!ok) errors.push(`${where}: a select needs options with value and label`);
  }
  return errors;
}

function stepErrors(s, where, techniques) {
  if (!s || typeof s !== "object") return [`${where}: not an object`];
  const errors = [];
  if (!isString(s.label) || !s.label.trim()) errors.push(`${where}: label is required`);
  else if (!isKey(s.key)) errors.push(`${where}: key must be snake_case`);
  if (!STEP_KINDS.includes(s.kind)) errors.push(`${where}: kind must be procedure or measurement`);
  if (!Array.isArray(s.params)) errors.push(`${where}: params must be a list`);
  else {
    s.params.forEach((p, i) => errors.push(...paramErrors(p, `${where}, param ${i + 1}`)));
    const keys = s.params.map((p) => p?.key);
    if (new Set(keys).size !== keys.length) errors.push(`${where}: param keys must be unique`);
  }
  if (!isStringArray(s.equipmentTypes)) errors.push(`${where}: equipmentTypes must be a list of values`);
  if (typeof s.optional !== "boolean") errors.push(`${where}: optional must be true or false`);
  if (typeof s.repeatable !== "boolean") errors.push(`${where}: repeatable must be true or false`);
  if (s.repeatable && !REPEAT_AS.includes(s.repeatAs)) errors.push(`${where}: repeatAs must be subsample or label`);
  if (!s.repeatable && s.repeatAs !== undefined) errors.push(`${where}: repeatAs is only for repeatable steps`);
  if (s.kind === "measurement") {
    if (s.technique !== null && !techniques.includes(s.technique)) {
      errors.push(`${where}: unknown technique ${JSON.stringify(s.technique)}`);
    }
    if (!isStringArray(s.expectedQuantities)) errors.push(`${where}: expectedQuantities must be a list of values`);
  } else if (s.technique !== undefined || s.expectedQuantities !== undefined) {
    errors.push(`${where}: technique and expectedQuantities are only for measurement steps`);
  }
  return errors;
}

/**
 * Errors in a `protocols` config list, as readable strings; empty when valid.
 * `techniques` are the parser techniques a measurement step may name.
 */
export function validateProtocols(protocols, techniques) {
  if (!Array.isArray(protocols)) return ["protocols must be a list"];
  const errors = [];
  protocols.forEach((p, i) => {
    const where = `Protocol ${isString(p?.label) && p.label ? `"${p.label}"` : i + 1}`;
    if (!p || typeof p !== "object") return errors.push(`${where}: not an object`);
    if (!isString(p.label) || !p.label.trim()) errors.push(`${where}: label is required`);
    else if (!isKey(p.value)) errors.push(`${where}: value must be snake_case`);
    if (p.description !== undefined && !isString(p.description)) errors.push(`${where}: description must be text`);
    if (!isStringArray(p.appliesToSampleTypes)) errors.push(`${where}: appliesToSampleTypes must be a list of values`);
    if (!Array.isArray(p.steps) || p.steps.length === 0) {
      errors.push(`${where}: needs at least one step`);
      return;
    }
    p.steps.forEach((s, j) => errors.push(...stepErrors(s, `${where}, step ${j + 1}`, techniques)));
    const keys = p.steps.map((s) => s?.key);
    if (new Set(keys).size !== keys.length) errors.push(`${where}: step keys must be unique`);
  });
  const values = protocols.map((p) => p?.value);
  if (new Set(values).size !== values.length) errors.push("Protocol values must be unique");
  return errors;
}

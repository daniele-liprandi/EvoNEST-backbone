import {
  applyQuantityChoices,
  findNewQuantities,
  knownQuantities,
} from "@/utils/file-management/quantity-mapping";

const lab = [
  { value: "mass", label: "Mass", unit: "g" },
  { value: "youngs_modulus", label: "Young's modulus", unit: "GPa", aliases: ["modulus"] },
];

const parsed = (parserName: string | undefined, quantities: [string, string?][]) => ({
  dataFields: {
    parserName,
    experimentData: { traits: quantities.map(([quantity, unit]) => ({ quantity, unit })) },
  },
});

beforeAll(() => jest.spyOn(console, "log").mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

describe("knownQuantities", () => {
  test("includes values and aliases", () => {
    expect([...knownQuantities(lab)].sort()).toEqual(["mass", "modulus", "youngs_modulus"]);
  });
});

describe("findNewQuantities", () => {
  test("returns only unknown quantities, once each, with the parser's declaration", () => {
    const files = [
      parsed("TensileTestFormatParser", [["youngs_modulus", "Pa"], ["tensile_strength", "Pa"], ["modulus", "Pa"]]),
      parsed("TensileTestFormatParser", [["tensile_strength", "Pa"]]),
    ];
    expect(findNewQuantities(files, lab)).toEqual([
      { value: "tensile_strength", label: "Tensile strength", unit: "Pa", description: "Stress at which the specimen breaks" },
    ]);
  });

  test("falls back to the trait's own unit and a readable label without a declaration", () => {
    expect(findNewQuantities([parsed("CSVFormatParser", [["wing_length", "mm"]])], lab)).toEqual([
      { value: "wing_length", label: "Wing length", unit: "mm", description: "" },
    ]);
  });

  test("nothing new, nothing returned", () => {
    expect(findNewQuantities([parsed(undefined, [["mass"]])], lab)).toEqual([]);
  });
});

describe("applyQuantityChoices", () => {
  const newTypes = [
    { value: "tensile_strength", label: "Tensile strength", unit: "Pa", description: "" },
    { value: "body_mass", label: "Body mass", unit: "g", description: "" },
    { value: "strain_rate", label: "Strain rate", unit: "1/s", description: "" },
  ];

  test("adds, maps and skips", () => {
    const next = applyQuantityChoices(lab, newTypes, {
      tensile_strength: { action: "add" },
      body_mass: { action: "map", to: "mass" },
      strain_rate: { action: "skip" },
    });
    expect(next).toEqual([
      { value: "mass", label: "Mass", unit: "g", aliases: ["body_mass"] },
      { value: "youngs_modulus", label: "Young's modulus", unit: "GPa", aliases: ["modulus"] },
      { value: "tensile_strength", label: "Tensile strength", unit: "Pa" },
    ]);
  });

  test("defaults to add", () => {
    const next = applyQuantityChoices(lab, [newTypes[0]], {});
    expect(next?.at(-1)?.value).toBe("tensile_strength");
  });

  test("returns null when every choice is skip", () => {
    expect(applyQuantityChoices(lab, newTypes, Object.fromEntries(newTypes.map((t) => [t.value, { action: "skip" as const }])))).toBeNull();
  });

  test("does not mutate the input", () => {
    const copy = JSON.parse(JSON.stringify(lab));
    applyQuantityChoices(lab, newTypes, { body_mass: { action: "map", to: "mass" } });
    expect(lab).toEqual(copy);
  });
});

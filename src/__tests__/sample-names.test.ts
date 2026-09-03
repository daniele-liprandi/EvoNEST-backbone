import { generateBaseId, nextNameFor, regenerateSampleNames, baseOf } from "@/shared/config/sample-names";

const ID = { combinations: [[3, 3], [3, 4], [4, 3]], startingNumber: 1, numberPadding: 0 };

describe("baseOf", () => {
  test("strips trailing digits", () => {
    expect(baseOf("Aradia12")).toBe("Aradia");
    expect(baseOf("Aradia")).toBe("Aradia");
  });
});

describe("generateBaseId", () => {
  test("first combination when there is no collision", () => {
    expect(generateBaseId("Araneus", "diadematus", "animal", [], ID.combinations)).toBe("Aradia");
  });

  test("skips a combination that collides with a different species", () => {
    const samples = [{ name: "Aradia1", genus: "Aradia", species: "something", type: "animal" }];
    // "Aradia" (3+3) collides -> try 3+4 -> "Aradiad"
    expect(generateBaseId("Araneus", "diadematus", "animal", samples, ID.combinations)).toBe("Aradiad");
  });

  test("same species is not a collision", () => {
    const samples = [{ name: "Aradia1", genus: "Araneus", species: "diadematus", type: "animal" }];
    expect(generateBaseId("Araneus", "diadematus", "animal", samples, ID.combinations)).toBe("Aradia");
  });
});

describe("nextNameFor", () => {
  test("first free number for the species", () => {
    const samples = [
      { name: "Aradia1", genus: "Araneus", species: "diadematus", type: "animal" },
      { name: "Aradia2", genus: "Araneus", species: "diadematus", type: "animal" },
    ];
    expect(nextNameFor({ genus: "Araneus", species: "diadematus", type: "animal" }, samples, ID)).toBe("Aradia3");
  });
});

describe("regenerateSampleNames", () => {
  test("renames a batch with clean, non-colliding numbering", () => {
    const all = [
      { _id: "a", name: "Aradia1", genus: "Araneus", species: "diadematus", type: "animal" },
      { _id: "b", name: "Aradia2", genus: "Araneus", species: "diadematus", type: "animal" },
      { _id: "c", name: "Aramar1", genus: "Araneus", species: "marmoreus", type: "animal" },
    ];
    // a and b are re-identified as Araneus marmoreus
    const targets = [
      { _id: "a", genus: "Araneus", species: "marmoreus", type: "animal", name: "Aradia1" },
      { _id: "b", genus: "Araneus", species: "marmoreus", type: "animal", name: "Aradia2" },
    ];
    const result = regenerateSampleNames(targets, all, ID);
    expect(result.get("a")).toBe("Aramar2");
    expect(result.get("b")).toBe("Aramar3");
    // no duplicates, and the untouched Aramar1 is respected
    expect(new Set(result.values()).size).toBe(2);
  });

  test("a target's own old name is freed for reuse", () => {
    const all = [{ _id: "a", name: "Aradia1", genus: "Araneus", species: "diadematus", type: "animal" }];
    const targets = [{ _id: "a", genus: "Araneus", species: "diadematus", type: "animal", name: "Aradia1" }];
    // nothing else uses Aradia1, and a's old name is freed -> back to Aradia1
    expect(regenerateSampleNames(targets, all, ID).get("a")).toBe("Aradia1");
  });
});

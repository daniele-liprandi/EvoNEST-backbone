import { parseOptions, prettifyKey } from "@/app/(nest)/settings/types/list-editor";

describe("parseOptions", () => {
  test("bare values become value and label", () => {
    expect(parseOptions("seedling\nvegetative")).toEqual([
      { value: "seedling", label: "seedling" },
      { value: "vegetative", label: "vegetative" },
    ]);
  });

  test("value: Label splits on the first colon", () => {
    expect(parseOptions("in-collection: In collection\non-loan: On loan")).toEqual([
      { value: "in-collection", label: "In collection" },
      { value: "on-loan", label: "On loan" },
    ]);
  });

  test("blank lines are ignored", () => {
    expect(parseOptions("\n a \n\n b \n")).toEqual([
      { value: "a", label: "a" },
      { value: "b", label: "b" },
    ]);
  });
});

describe("prettifyKey", () => {
  test("splits camelCase and sentence-cases", () => {
    expect(prettifyKey("recentChange")).toBe("Recent change");
    expect(prettifyKey("name")).toBe("Name");
  });
});

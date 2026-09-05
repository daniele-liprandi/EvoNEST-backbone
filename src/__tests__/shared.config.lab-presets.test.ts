import { suggestPreset } from "@/shared/config/lab-presets";

describe("suggestPreset", () => {
  test("empty or missing description suggests nothing", () => {
    expect(suggestPreset("")).toBeNull();
    expect(suggestPreset("   ")).toBeNull();
    expect(suggestPreset(undefined as unknown as string)).toBeNull();
  });

  test("description with no matching vocabulary suggests nothing", () => {
    expect(suggestPreset("We are still figuring out what we study.")).toBeNull();
  });

  test("matches on domain keywords, case-insensitively", () => {
    expect(suggestPreset("We study SPIDER SILK tensile properties and fibre diameter.")).toBe(
      "silk-biomechanics",
    );
  });

  test("matches a live arthropod colony to husbandry", () => {
    expect(suggestPreset("We keep a live insect colony and track feeding and moulting.")).toBe(
      "arthropod-husbandry",
    );
  });

  test("matches an agricultural field trial to crop-field-trial", () => {
    expect(
      suggestPreset("Our lab runs a crop field trial: sowing, harvest and fertiliser treatments per plot."),
    ).toBe("crop-field-trial");
  });

  test("a generic botany description prefers herbarium over the crop trial", () => {
    expect(suggestPreset("We curate a herbarium of pressed plant specimens.")).toBe("herbarium");
  });

  test("matches vertebrate tissue banking", () => {
    expect(suggestPreset("A tissue bank of blood and tissue samples from vertebrates.")).toBe(
      "vertebrate-tissue",
    );
  });

  test("matches sequencing pipelines", () => {
    expect(suggestPreset("We run samples through library prep and sequencing on an Illumina platform.")).toBe(
      "sequencing-pipeline",
    );
  });

  test("matches microbial culture collections", () => {
    expect(suggestPreset("A bacterial culture collection with cryostock and passage tracking.")).toBe(
      "microbial-culture",
    );
  });

  test("does not match on a substring inside another word", () => {
    // "cat" should not match inside "catalogued", "isolate" should not fire from "isolated"
    expect(suggestPreset("Everything here is meticulously catalogued and isolated from the rest.")).not.toBe(
      "microbial-culture",
    );
  });

  test("higher keyword-hit count wins over a single hit elsewhere", () => {
    // three crop-trial terms vs. one incidental "plant" mention
    expect(
      suggestPreset("A crop field trial tracking farming yield; plants are grown across plots."),
    ).toBe("crop-field-trial");
  });
});

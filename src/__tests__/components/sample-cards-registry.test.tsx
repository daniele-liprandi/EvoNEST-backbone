import {
  ALL_CARDS,
  getCardByName,
  getSampleCards,
  getMainCards,
  getSidebarCards,
  getFilteredCards,
} from "@/components/sample-cards/registry";

const names = (cards: any[]) => cards.map((c) => c.displayName);

describe("card metadata", () => {
  test("every card has a unique displayName and a supportedTypes array", () => {
    const seen = new Set<string>();
    for (const card of ALL_CARDS) {
      expect(typeof card.displayName).toBe("string");
      expect(seen.has(card.displayName)).toBe(false);
      seen.add(card.displayName);
      expect(Array.isArray(card.supportedTypes)).toBe(true);
    }
  });

  test("type-specific cards no longer carry a redundant type-check shouldRender", () => {
    for (const card of ALL_CARDS as any[]) {
      if (card.supportedTypes.includes("*") || !card.shouldRender) continue;
      // a real condition inspects a field, not just sample.type
      expect(card.shouldRender.toString()).not.toMatch(/sample\.type ===/);
    }
  });
});

describe("getSampleCards", () => {
  test("a type gets the universal cards plus the cards built for it", () => {
    const got = names(getSampleCards("animal"));
    expect(got).toContain("AnimalCard");
    expect(got).toContain("EditFieldsCard"); // universal
    expect(got).not.toContain("PlantCard");
  });

  test("an unknown type with no config gets only universal cards", () => {
    const got = names(getSampleCards("myceliUm"));
    expect(got).toContain("GalleryCard");
    expect(got).not.toContain("AnimalCard");
    expect(got).not.toContain("PlantCard");
  });

  test("a type config can opt into a card built for another type", () => {
    const got = names(getSampleCards("crop", { value: "crop", cards: ["PlantCard"] } as any));
    expect(got).toContain("PlantCard");
  });

  test("position narrows the set", () => {
    // AnimalCard.position === 'sidebar', EditFieldsCard.position === 'main'
    expect(names(getSidebarCards("animal"))).toContain("AnimalCard");
    expect(names(getMainCards("animal"))).not.toContain("AnimalCard");
    expect(names(getMainCards("animal"))).toContain("EditFieldsCard");
  });
});

describe("getFilteredCards", () => {
  test("drops a card whose shouldRender condition fails, keeps ones with none", () => {
    const cards = getMainCards("animal");
    const withFiles = getFilteredCards(cards, { type: "animal", filesId: ["a"], family: "Felidae" });
    const without = getFilteredCards(cards, { type: "animal" });
    expect(names(withFiles)).toContain("EditFieldsCard"); // family present
    expect(names(without)).not.toContain("EditFieldsCard");
  });
});

describe("getCardByName", () => {
  test("resolves a known card and returns null otherwise", () => {
    expect(getCardByName("PlantCard")?.displayName).toBe("PlantCard");
    expect(getCardByName("NopeCard")).toBeNull();
  });
});

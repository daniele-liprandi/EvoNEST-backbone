import type { LabelType } from "@/utils/types";
import dataFormatParserRegistry from "./readable-data-extractors/registry";
import type { GeneratedTrait } from "./readable-data-extractors/types";

export type QuantityChoice = { action: "add" } | { action: "map"; to: string } | { action: "skip" };

export type NewQuantity = GeneratedTrait;

type ParsedFile = {
  dataFields?: {
    parserName?: string;
    experimentData?: { traits?: { quantity?: string; unit?: string }[] };
  };
};

const humanise = (value: string) => {
  const words = value.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Includes the aliases */
export const knownQuantities = (traitquantities: LabelType[]) => {
  const known = new Set<string>();
  for (const t of traitquantities) {
    known.add(t.value);
    for (const alias of t.aliases ?? []) known.add(alias);
  }
  return known;
};

/** New quantities in the parsed files, described from the parser's declaration. */
export function findNewQuantities(files: ParsedFile[], traitquantities: LabelType[]): NewQuantity[] {
  const known = knownQuantities(traitquantities);
  const found = new Map<string, NewQuantity>();
  for (const file of files) {
    const declared = file.dataFields?.parserName
      ? dataFormatParserRegistry.getByName(file.dataFields.parserName)?.generatedTraits ?? []
      : [];
    for (const trait of file.dataFields?.experimentData?.traits ?? []) {
      const value = trait.quantity;
      if (!value || known.has(value) || found.has(value)) continue;
      const declaration = (declared as GeneratedTrait[]).find((d) => d.value === value);
      found.set(value, {
        value,
        label: declaration?.label ?? humanise(value),
        unit: declaration?.unit ?? trait.unit ?? "",
        description: declaration?.description ?? "",
      });
    }
  }
  return [...found.values()];
}

/** "add" appends a quantity, "map" adds an alias; null when nothing changes. */
export function applyQuantityChoices(
  traitquantities: LabelType[],
  newTypes: NewQuantity[],
  choices: Record<string, QuantityChoice>,
): LabelType[] | null {
  let changed = false;
  const next: LabelType[] = traitquantities.map((t) => ({ ...t, aliases: [...(t.aliases ?? [])] }));
  for (const type of newTypes) {
    const choice = choices[type.value] ?? { action: "add" };
    if (choice.action === "add") {
      next.push({
        value: type.value,
        label: type.label,
        ...(type.unit ? { unit: type.unit } : {}),
        ...(type.description ? { description: type.description } : {}),
      });
      changed = true;
    } else if (choice.action === "map") {
      const target = next.find((t) => t.value === choice.to);
      if (target && !target.aliases?.includes(type.value)) {
        target.aliases = [...(target.aliases ?? []), type.value];
        changed = true;
      }
    }
  }
  if (!changed) return null;
  return next.map((t) => {
    if (t.aliases?.length) return t;
    const rest = { ...t };
    delete rest.aliases;
    return rest;
  });
}

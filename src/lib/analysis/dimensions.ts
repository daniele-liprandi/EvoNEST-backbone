import type { Document } from "mongodb";
import { buildSampleFields } from "@/app/(nest)/samples/fields";

export type Source = "samples" | "traits";

export type DimensionContext = {
  sample: Document;
  trait?: Document;
  samplesById: Map<string, Document>;
  userNames: Map<string, string>;
};

export type Dimension = {
  id: string;
  label: string;
  sources: Source[];
  get: (ctx: DimensionContext) => string | null;
};

const text = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

const collectionDate = (sample: Document): Date | null => {
  const d = sample.date ? new Date(sample.date) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

const BOTH: Source[] = ["samples", "traits"];

const BUILTIN: Dimension[] = [
  { id: "type", label: "Sample type", sources: BOTH, get: ({ sample }) => text(sample.type) },
  // `silktype` is the legacy silk-only name for `subsampletype`.
  {
    id: "subsampletype",
    label: "Subsample type",
    sources: BOTH,
    get: ({ sample }) => text(sample.subsampletype ?? sample.silktype),
  },
  { id: "family", label: "Family", sources: BOTH, get: ({ sample }) => text(sample.family) },
  { id: "genus", label: "Genus", sources: BOTH, get: ({ sample }) => text(sample.genus) },
  {
    id: "species",
    label: "Species",
    sources: BOTH,
    get: ({ sample }) => {
      const name = [text(sample.genus), text(sample.species)].filter(Boolean).join(" ");
      return name || null;
    },
  },
  {
    id: "parent",
    label: "Parent sample",
    sources: BOTH,
    get: ({ sample, samplesById }) => text(samplesById.get(String(sample.parentId ?? ""))?.name),
  },
  {
    id: "responsible",
    label: "Responsible",
    sources: BOTH,
    get: ({ sample, userNames }) => text(userNames.get(String(sample.responsible ?? ""))),
  },
  {
    id: "year",
    label: "Collection year",
    sources: BOTH,
    get: ({ sample }) => {
      const d = collectionDate(sample);
      return d ? String(d.getUTCFullYear()) : null;
    },
  },
  {
    id: "month",
    label: "Collection month",
    sources: BOTH,
    get: ({ sample }) => {
      const d = collectionDate(sample);
      return d ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}` : null;
    },
  },
  { id: "equipment", label: "Equipment", sources: ["traits"], get: ({ trait }) => text(trait?.equipment) },
  {
    id: "nfibres",
    label: "Number of fibres",
    sources: ["traits"],
    get: ({ trait }) => text(trait?.nfibres)?.toLowerCase() ?? null,
  },
];

// Configured fields that make no sense as a grouping: free text, dates (the
// built-in year/month buckets cover the collection date) and fields with their
// own built-in dimension above.
const SKIP_FIELD_KINDS = new Set(["textarea", "date"]);
const SKIP_FIELD_KEYS = new Set(["taxonomy", "parent", "responsible", "date", "subsampletype"]);

/**
 * Every dimension a summary can group or filter on: the built-ins plus the
 * fields configured on the lab's sample types. Internal keys (`_id`, logbook,
 * timestamps) never appear.
 */
export function buildDimensions(sampleTypesConfig: unknown[]): Dimension[] {
  const taken = new Set(BUILTIN.map((d) => d.id));
  const fields: Dimension[] = [];
  for (const typeConfig of sampleTypesConfig) {
    for (const field of buildSampleFields(typeConfig) as { key: string; label: string; kind?: string }[]) {
      if (taken.has(field.key) || SKIP_FIELD_KEYS.has(field.key)) continue;
      if (field.kind && SKIP_FIELD_KINDS.has(field.kind)) continue;
      taken.add(field.key);
      fields.push({
        id: field.key,
        label: field.label,
        sources: BOTH,
        get: ({ sample }) => text(sample[field.key]),
      });
    }
  }
  return [...BUILTIN, ...fields];
}

export const dimensionsFor = (dimensions: Dimension[], source: Source) =>
  dimensions.filter((d) => d.sources.includes(source));

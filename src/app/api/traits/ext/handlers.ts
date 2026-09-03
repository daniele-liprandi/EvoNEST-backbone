import { Effect } from "effect";
import { NextResponse } from "next/server";
import type { Document } from "mongodb";

import { runRoute, Mongo, apiKeyAuth, NotFoundError, ValidationError } from "@/lib/effect";
import { sampleChain } from "@/app/api/utils/sampleChain";

type NFibres =
  | { type: "single"; value: number }
  | { type: "range"; min: number; max: number; avg: number }
  | { error: string };

function parseNFibres(nfibres: string | undefined | null): NFibres {
  if (!nfibres) return { error: "Missing nfibres value" };
  if (nfibres.toLowerCase() === "bundle") return { type: "single", value: 1 };

  if (nfibres.includes("-")) {
    const [min, max] = nfibres.split("-").map((n) => parseInt(n.trim(), 10));
    if (Number.isNaN(min) || Number.isNaN(max)) return { error: "Invalid range format" };
    return { type: "range", min, max, avg: (min + max) / 2 };
  }

  const value = parseInt(nfibres, 10);
  if (Number.isNaN(value)) return { error: "Invalid number format" };
  return { type: "single", value };
}

const calculateArea = (diameter: number, count: number) =>
  ((Math.PI * diameter * diameter) / 4) * count;

// A diameter trait becomes one or more cross-section rows (min/max/avg for a
// fibre-count range, a single row otherwise).
function crossSectionRows(trait: Document): Document[] {
  const info = parseNFibres(trait.nfibres ?? "1");
  if ("error" in info) return [];

  if (info.type === "range") {
    return (
      [
        ["cross-section-min", info.min],
        ["cross-section-max", info.max],
        ["cross-section-avg", info.avg],
      ] as const
    ).map(([type, n]) => ({
      ...trait,
      type,
      measurement: calculateArea(trait.measurement, n),
      unit: "μm²",
      nfibres: n.toString(),
      derivedFrom: trait._id,
    }));
  }

  return [
    {
      ...trait,
      type: "cross-section",
      measurement: calculateArea(trait.measurement, info.value),
      unit: "μm²",
      nfibres: info.value.toString(),
      derivedFrom: trait._id,
    },
  ];
}

export const exportTraits = (request: Request) =>
  Effect.gen(function* () {
    const { database } = yield* apiKeyAuth(request);
    const params = new URL(request.url).searchParams;

    const format = params.get("format") ?? "json";
    if (format.toLowerCase() !== "json") {
      return yield* Effect.fail(new ValidationError({ message: "Only JSON export is supported" }));
    }

    const type = params.get("type");
    const includeSampleFeatures = params.get("includeSampleFeatures") === "true";
    const includeRelated = params.get("includeRelated") === "true";

    const mongo = yield* Mongo;
    const traits = yield* mongo.find(database, "traits", type ? { type } : {});
    if (traits.length === 0) {
      return yield* Effect.fail(new NotFoundError({ resource: "Traits" }));
    }

    if (includeSampleFeatures) {
      const samples = yield* mongo.find(database, "samples");
      const byId = new Map(samples.map((s) => [s._id.toString(), s]));
      for (const trait of traits) {
        const sample = byId.get(trait.sampleId?.toString());
        if (sample) trait.sample = sample;
      }
    }

    if (includeRelated) {
      for (const trait of traits) {
        if (trait.sampleId) {
          trait.sampleChain = yield* sampleChain(database, trait.sampleId);
        }
      }
    }

    const derived = traits
      .filter((t) => t.type === "diameter" && t.measurement)
      .flatMap(crossSectionRows);
    const all = traits.concat(derived);

    const stamp = new Date().toISOString().slice(0, 10);
    return NextResponse.json(
      {
        database,
        exportDate: new Date().toISOString(),
        totalTraits: all.length,
        originalTraits: traits.length,
        derivedTraits: derived.length,
        filters: { type: type ?? "all", includeSampleFeatures, includeRelated },
        traits: all,
      },
      { headers: { "Content-Disposition": `attachment; filename="traits_${database}_${stamp}.json"` } },
    );
  });

export const GET = (request: Request) => runRoute(exportTraits(request));

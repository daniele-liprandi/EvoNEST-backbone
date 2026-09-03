import { Effect, Schema } from "effect";
import { ok, decodeBody, sessionOrService, ValidationError, BadGatewayError } from "@/lib/effect";

const REQUEST_TIMEOUT_MS = 10_000;
const GNAMES_URL = "https://verifier.globalnames.org/api/v1/verifications";
// Catalogue of Life, Encyclopedia of Life, GBIF.
const GNAMES_DATA_SOURCES = [1, 12, 13];

/** "araneus  DIADEMATUS" -> "Araneus diadematus" */
const titleCaseName = (name: string) => {
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return name.trim();
  return [
    words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase(),
    ...words.slice(1).map((w) => w.toLowerCase()),
  ].join(" ");
};

/** Fallbacks proposed when GNames does not recognise a name (it never rejects). */
const suggestionsFor = (name: string) => {
  const cleaned = titleCaseName(name);
  const genus = cleaned.split(/\s+/)[0];
  return [...new Set([`${genus} sp.`, cleaned])];
};

interface TaxonInfo {
  canonical_form: string;
  kingdom: string;
  phylum: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  species: string;
}

const extractTaxonomicInfo = (data: {
  names?: Array<{ bestResult?: Record<string, string> }>;
}): TaxonInfo | null => {
  const result = data.names?.[0]?.bestResult;
  if (!result) return null;

  const canonicalForm = result.currentCanonicalSimple || result.matchedCanonicalSimple;
  const path = result.classificationPath ? result.classificationPath.split("|") : [];
  const ranks = result.classificationRanks ? result.classificationRanks.split("|") : [];

  const info: TaxonInfo = {
    canonical_form: canonicalForm,
    kingdom: "",
    phylum: "",
    class: "",
    order: "",
    family: "",
    genus: "",
    species: "",
  };
  ranks.forEach((rank, i) => {
    const key = rank.toLowerCase() as keyof TaxonInfo;
    if (path[i] && Object.prototype.hasOwnProperty.call(info, key)) info[key] = path[i];
  });

  if (info.species && info.species.includes(" ")) {
    info.species = info.species.split(" ").pop() as string;
  }
  if (!info.genus && info.family) {
    info.genus = "gen.";
    info.species = "sp.";
    info.canonical_form = `${info.family} gen. sp.`;
  } else if (!info.species && info.family) {
    info.species = "sp.";
    info.canonical_form = `${info.genus} sp.`;
  }
  return info;
};

const queryGNames = (taxa: string) =>
  Effect.tryPromise({
    try: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(GNAMES_URL, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nameStrings: [taxa],
            dataSources: GNAMES_DATA_SOURCES,
            withAllMatches: false,
            withStats: true,
            mainTaxonThreshold: 0.6,
          }),
        });
        if (!response.ok) throw new Error(`GNames responded ${response.status}`);
        return (await response.json()) as Parameters<typeof extractTaxonomicInfo>[0];
      } finally {
        clearTimeout(timeout);
      }
    },
    catch: (cause) =>
      new BadGatewayError({ message: "Could not reach the Global Names verifier", cause }),
  }).pipe(Effect.map(extractTaxonomicInfo));

export const checkNamesHealth = ok({ message: "checkname API working" });

const Body = Schema.Struct(
  { taxa: Schema.optional(Schema.String), method: Schema.optional(Schema.String) },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);

export const checkName = (request: Request) =>
  Effect.gen(function* () {
    // checknames is excluded from the auth middleware so the Mastra service can
    // reach it; accept a session or the service key.
    yield* sessionOrService(request);
    const data = yield* decodeBody(Body)(request);

    const taxa = typeof data.taxa === "string" ? data.taxa.trim() : "";
    if (!taxa) return yield* Effect.fail(new ValidationError({ message: "taxa is required" }));
    const method = data.method === "fullTaxaInfo" ? "fullTaxaInfo" : "correctName";

    const info = yield* queryGNames(taxa);
    if (!info) {
      return yield* ok({
        status: "unrecognised",
        data: taxa,
        suggestions: suggestionsFor(taxa),
        source: "GNames",
      });
    }
    return yield* ok({
      status: "success",
      data: method === "fullTaxaInfo" ? info : info.canonical_form,
      source: "GNames",
    });
  });

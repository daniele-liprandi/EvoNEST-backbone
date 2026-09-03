import { Effect, Schema } from "effect";
import { ok, decodeSearchParams, NonEmptyString, NotFoundError, InternalError } from "@/lib/effect";

/**
 * @swagger
 * /api/searchGBIFImage:
 *   get:
 *     summary: Find a species image via GBIF
 *     tags: [Utilities]
 *     parameters:
 *       - { in: query, name: query, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: "{ imageUrl, rightsHolder, country }" }
 *       400: { description: Missing query }
 *       404: { description: No image found }
 */

const GBIF_TIMEOUT_MS = 10_000;
const Params = Schema.Struct({ query: NonEmptyString });

interface GbifResult {
  readonly media?: ReadonlyArray<{ type?: string; identifier?: string }>;
  readonly rightsHolder?: string;
  readonly country?: string;
}

const fetchGbif = (query: string) =>
  Effect.tryPromise({
    try: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GBIF_TIMEOUT_MS);
      try {
        const url = `https://api.gbif.org/v1/occurrence/search?mediaType=StillImage&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`GBIF returned ${response.status}`);
        return (await response.json()) as { results?: ReadonlyArray<GbifResult> };
      } finally {
        clearTimeout(timeout);
      }
    },
    catch: (cause) => new InternalError({ message: "GBIF request failed", cause }),
  });

export const searchGbifImage = (request: Request) =>
  Effect.gen(function* () {
    const { query } = yield* decodeSearchParams(Params)(request);
    const data = yield* fetchGbif(query);

    const hit = (data.results ?? []).find((r) => r.media?.[0]?.type === "StillImage");
    if (!hit?.media?.[0]?.identifier) {
      return yield* Effect.fail(new NotFoundError({ resource: "Image" }));
    }
    return yield* ok({
      imageUrl: hit.media[0].identifier,
      rightsHolder: hit.rightsHolder || "Unknown",
      country: hit.country || "Unknown",
    });
  });

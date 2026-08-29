import { Effect, Schema } from "effect";
import {
  runRoute,
  ok,
  decodeSearchParams,
  NonEmptyString,
  NotFoundError,
  InternalError,
} from "@/lib/effect";

/**
 * @swagger
 * /api/searchGBIFImage:
 *   get:
 *     summary: Search for species images in GBIF
 *     description: Search the Global Biodiversity Information Facility for an image of a species
 *     tags:
 *       - Utilities
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Species name or search query
 *     responses:
 *       200:
 *         description: Image found
 *       400:
 *         description: Missing query
 *       404:
 *         description: No image found for the query
 *       500:
 *         description: GBIF request failed
 */

const GBIF_TIMEOUT_MS = 10_000;

const Params = Schema.Struct({ query: NonEmptyString });

interface GbifResult {
  readonly media?: ReadonlyArray<{ type?: string; identifier?: string }>;
  readonly rightsHolder?: string;
  readonly country?: string;
}

export const searchGbifImage = (request: Request) =>
  Effect.gen(function* () {
    const { query } = yield* decodeSearchParams(Params)(request);
    const url = `https://api.gbif.org/v1/occurrence/search?mediaType=StillImage&q=${encodeURIComponent(query)}`;

    const data = yield* Effect.tryPromise({
      try: async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), GBIF_TIMEOUT_MS);
        try {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error(`GBIF returned ${response.status}`);
          return (await response.json()) as { results?: ReadonlyArray<GbifResult> };
        } finally {
          clearTimeout(timeout);
        }
      },
      catch: (cause) => new InternalError({ message: "GBIF request failed", cause }),
    });

    const hit = (data.results ?? []).find(
      (result) => Array.isArray(result.media) && result.media[0]?.type === "StillImage",
    );

    if (!hit || !hit.media?.[0]?.identifier) {
      return yield* Effect.fail(new NotFoundError({ resource: "Image" }));
    }

    return yield* ok({
      imageUrl: hit.media[0].identifier,
      rightsHolder: hit.rightsHolder || "Unknown",
      country: hit.country || "Unknown",
    });
  });

export const GET = (request: Request) => runRoute(searchGbifImage(request));

import { Effect, Schema } from "effect";
import { runRoute, ok, decodeBody, sessionOrService, NotFoundError, InternalError } from "@/lib/effect";

/**
 * @swagger
 * /api/geocoding:
 *   post:
 *     summary: Geocode a location name via OpenStreetMap Nominatim
 *     tags: [Utilities]
 *     responses:
 *       200: { description: "{ coordinates, attribution }" }
 *       401: { description: Unauthorized }
 *       404: { description: Location not found }
 */

const REQUEST_TIMEOUT_MS = 8_000;
const NOMINATIM_MIN_INTERVAL_MS = 1_000;
let lastRequestAt = 0;

const Body = Schema.Struct({ location: Schema.String });

const throttle = Effect.promise(async () => {
  const wait = NOMINATIM_MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
});

const geocode = (location: string) =>
  Effect.tryPromise({
    try: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { "User-Agent": "EvoNEST-backbone/1.0 (research platform)" },
        });
        return (await response.json()) as Array<Record<string, unknown>>;
      } finally {
        clearTimeout(timeout);
      }
    },
    catch: (cause) => new InternalError({ message: "Geocoding request failed", cause }),
  });

export const geocodeLocation = (request: Request) =>
  Effect.gen(function* () {
    yield* sessionOrService(request);
    const { location } = yield* decodeBody(Body)(request);

    yield* throttle;
    const results = yield* geocode(location);
    if (results.length === 0) {
      return yield* Effect.fail(new NotFoundError({ resource: "Location" }));
    }
    return yield* ok({ coordinates: results[0], attribution: "Geocoding by Nominatim (OpenStreetMap)" });
  });

export const POST = (request: Request) => runRoute(geocodeLocation(request));

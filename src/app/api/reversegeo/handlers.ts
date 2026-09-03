import { Effect, Schema } from "effect";
import { ok, decodeBody, sessionOrService, NotFoundError } from "@/lib/effect";
import { nominatim } from "@/app/api/utils/nominatim";

/**
 * @swagger
 * /api/reversegeo:
 *   post:
 *     summary: Reverse geocode coordinates to an address via OpenStreetMap Nominatim
 *     tags: [Utilities]
 *     responses:
 *       200: { description: "{ location, attribution }" }
 *       400: { description: Invalid body }
 *       401: { description: Unauthorized }
 *       404: { description: No address for those coordinates }
 */

const Coord = Schema.Union(Schema.Number, Schema.String);
const Body = Schema.Struct({ lat: Coord, lon: Coord });

export const reverseGeocode = (request: Request) =>
  Effect.gen(function* () {
    yield* sessionOrService(request);
    const { lat, lon } = yield* decodeBody(Body)(request);

    const data = (yield* nominatim(`reverse?lat=${lat}&lon=${lon}&format=json`)) as {
      address?: Record<string, unknown>;
    };
    if (!data?.address) {
      return yield* Effect.fail(new NotFoundError({ resource: "Address" }));
    }
    return yield* ok({
      location: data.address,
      attribution: "Reverse geocoding by Nominatim (OpenStreetMap)",
    });
  });

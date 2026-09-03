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

import { runRoute } from "@/lib/effect";
import { geocodeLocation } from "./handlers";

export const POST = (request: Request) => runRoute(geocodeLocation(request));

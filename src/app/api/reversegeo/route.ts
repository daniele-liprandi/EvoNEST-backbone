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

import { runRoute } from "@/lib/effect";
import { reverseGeocode } from "./handlers";

export const POST = (request: Request) => runRoute(reverseGeocode(request));

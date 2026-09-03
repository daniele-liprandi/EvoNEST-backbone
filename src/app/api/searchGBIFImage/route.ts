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

import { runRoute } from "@/lib/effect";
import { searchGbifImage } from "./handlers";

export const GET = (request: Request) => runRoute(searchGbifImage(request));

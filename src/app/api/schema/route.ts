/**
 * @swagger
 * /api/schema:
 *   get:
 *     summary: The live filterable columns per section
 *     description: >
 *       The live filterable columns per section (union of 30 sampled docs'
 *       keys, minus internal fields), plus the lab's configured `sampleTypes`,
 *       `traitTypes` and `subsampleTypes`. Consumed by the natural-language
 *       filter and the AI create tools. Service requests must pass `?dbName=`.
 *     tags: [Utilities]
 *     parameters:
 *       - { in: query, name: dbName, schema: { type: string } }
 *     responses:
 *       200: { description: "{ routes, sampleTypes, traitTypes, subsampleTypes }" }
 *       400: { description: dbName missing on a service request }
 *       401: { description: Unauthorized }
 */

import { runRoute } from "@/lib/effect";
import { getSchema } from "./handlers";

export const GET = (request: Request) => runRoute(getSchema(request));

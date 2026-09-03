/**
 * @swagger
 * /api/schema:
 *   get:
 *     summary: The live filterable columns per section
 *     description: >
 *       Samples every collection (30 docs) and returns the union of their keys,
 *       minus internal fields, plus the computed columns. Consumed by the
 *       natural-language filter. Service requests must pass `?dbName=`.
 *     tags: [Utilities]
 *     parameters:
 *       - { in: query, name: dbName, schema: { type: string } }
 *     responses:
 *       200: { description: "{ routes: [{ label, path, columns }] }" }
 *       400: { description: dbName missing on a service request }
 *       401: { description: Unauthorized }
 */

import { runRoute } from "@/lib/effect";
import { getSchema } from "./handlers";

export const GET = (request: Request) => runRoute(getSchema(request));

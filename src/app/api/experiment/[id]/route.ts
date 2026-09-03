/**
 * @swagger
 * /api/experiment/{id}:
 *   get:
 *     summary: One experiment by id
 *     tags: [Experiments]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: query, name: includeRawData, schema: { type: boolean } }
 *       - { in: query, name: includeOriginalData, schema: { type: boolean } }
 *     responses:
 *       200: { description: Experiment }
 *       400: { description: Invalid id }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */

import { runRoute } from "@/lib/effect";
import { getExperiment } from "./handlers";

export const GET = (request: Request) => runRoute(getExperiment(request));

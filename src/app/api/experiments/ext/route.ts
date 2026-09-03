/**
 * @swagger
 * /api/experiments/ext:
 *   get:
 *     summary: Export experiments with API key authentication
 *     description: Export experiments from a database in the structured JSON format. The key travels in the Authorization or X-API-Key header.
 *     tags:
 *       - Experiments
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: database
 *         required: true
 *         schema: { type: string }
 *         description: Database to export from
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *         description: Filter experiments by type
 *       - in: query
 *         name: includeRawData
 *         schema: { type: boolean, default: false }
 *         description: Include the raw experimental data
 *       - in: query
 *         name: includeOriginalData
 *         schema: { type: boolean, default: false }
 *         description: Prefer the original unprocessed data when raw data is included
 *       - in: query
 *         name: includeRelated
 *         schema: { type: boolean, default: false }
 *         description: Attach each experiment's sample chain and associated traits
 *     responses:
 *       200: { description: Experiments exported }
 *       400: { description: Missing database parameter or unsupported format }
 *       401: { description: Invalid or missing API key }
 *       404: { description: No experiments found }
 */

import { runRoute } from "@/lib/effect";
import { exportExperiments } from "./handlers";

export const GET = (request: Request) => runRoute(exportExperiments(request));

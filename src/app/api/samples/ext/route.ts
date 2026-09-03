/**
 * @swagger
 * /api/samples/ext:
 *   get:
 *     summary: Export samples with API key authentication
 *     description: Export samples from a database. The key travels in the Authorization or X-API-Key header.
 *     tags:
 *       - Samples
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
 *         description: Filter samples by type
 *       - in: query
 *         name: includeRelated
 *         schema: { type: boolean, default: false }
 *         description: Attach each sample's parent chain
 *     responses:
 *       200: { description: Samples exported }
 *       400: { description: Missing database parameter or unsupported format }
 *       401: { description: Invalid or missing API key }
 *       404: { description: No samples found }
 */

import { runRoute } from "@/lib/effect";
import { exportSamples } from "./handlers";

export const GET = (request: Request) => runRoute(exportSamples(request));

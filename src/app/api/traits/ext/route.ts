/**
 * @swagger
 * /api/traits/ext:
 *   get:
 *     summary: Export trait measurements with API key authentication
 *     description: Export traits from a database. The key travels in the Authorization or X-API-Key header. Diameter traits get derived cross-section rows.
 *     tags:
 *       - Traits
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
 *         description: Filter traits by type
 *       - in: query
 *         name: includeSampleFeatures
 *         schema: { type: boolean, default: false }
 *         description: Attach the sample record to each trait
 *       - in: query
 *         name: includeRelated
 *         schema: { type: boolean, default: false }
 *         description: Attach each trait's sample chain
 *     responses:
 *       200: { description: Traits exported }
 *       400: { description: Missing database parameter or unsupported format }
 *       401: { description: Invalid or missing API key }
 *       404: { description: No traits found }
 */

import { runRoute } from "@/lib/effect";
import { exportTraits } from "./handlers";

export const GET = (request: Request) => runRoute(exportTraits(request));

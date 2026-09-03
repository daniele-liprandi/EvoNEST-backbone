/**
 * @swagger
 * /api/experiments/export:
 *   get:
 *     summary: Download experiment data as JSON
 *     tags: [Experiments]
 *     parameters:
 *       - { in: query, name: format, schema: { type: string, default: json } }
 *       - { in: query, name: type, schema: { type: string, default: tensile_test } }
 *     responses:
 *       200: { description: JSON attachment }
 *       400: { description: Unsupported format }
 *       401: { description: Unauthorized }
 *       404: { description: No experiments found }
 */

import { runRoute } from "@/lib/effect";
import { exportExperiments } from "./handlers";

export const GET = (request: Request) => runRoute(exportExperiments(request));

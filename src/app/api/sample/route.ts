/**
 * @swagger
 * /api/sample:
 *   post:
 *     summary: Retrieve one sample by name, id, and/or type
 *     tags: [Sample]
 *     responses:
 *       200: { description: The sample }
 *       400: { description: No query field, or an invalid id }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */

import { runRoute } from "@/lib/effect";
import { findSample } from "./handlers";

export const POST = (request: Request) => runRoute(findSample(request));

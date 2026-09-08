/**
 * @swagger
 * /api/files/usage:
 *   get:
 *     summary: Storage footprint for the active NEST
 *     description: >
 *       `{ gridfsBytes, externalCount, fileCount }` — managed bytes in GridFS,
 *       the number of external links, and the total file count.
 *     tags: [Files]
 *     responses:
 *       200: { description: "{ gridfsBytes, externalCount, fileCount }" }
 *       401: { description: Unauthorized }
 */

import { runRoute } from "@/lib/effect";
import { fileUsage } from "./handlers";

export const GET = () => runRoute(fileUsage);

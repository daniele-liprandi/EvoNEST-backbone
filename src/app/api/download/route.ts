/**
 * @swagger
 * /api/download:
 *   get:
 *     summary: Download a file by its database id
 *     tags: [Files]
 *     parameters:
 *       - { in: query, name: id, required: true, schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' } }
 *     responses:
 *       200: { description: The file as an attachment }
 *       400: { description: Missing or malformed id }
 *       401: { description: Unauthorized }
 *       403: { description: The stored path is outside the storage root }
 *       404: { description: Not found in the database or on disk }
 */

import { runRoute } from "@/lib/effect";
import { downloadFile } from "./handlers";

export const GET = (request: Request) => runRoute(downloadFile(request));

/**
 * @swagger
 * /api/files/link:
 *   post:
 *     summary: Link a previously uploaded file to an entry
 *     description: >
 *       Moves a temporary file into the entry's directory, marks it permanent
 *       and appends a logbook line to the entry.
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileId, entryType, entryId]
 *             properties:
 *               fileId: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *               entryType: { type: string, enum: [sample, trait, experiment] }
 *               entryId: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     responses:
 *       200: { description: "{ success: true }" }
 *       400: { description: Missing or malformed fields }
 *       401: { description: Unauthorized }
 *       404: { description: File or entry not found }
 */

import { runRoute } from "@/lib/effect";
import { linkFile } from "./handlers";

export const POST = (request: Request) => runRoute(linkFile(request));

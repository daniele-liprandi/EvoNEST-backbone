/**
 * @swagger
 * /api/attachments/{id}:
 *   get:
 *     summary: One attachment by id
 *     tags: [Attachments]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Attachment }
 *       400: { description: Invalid id }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */

import { runRoute } from "@/lib/effect";
import { getAttachment } from "./handlers";

export const GET = (request: Request) => runRoute(getAttachment(request));

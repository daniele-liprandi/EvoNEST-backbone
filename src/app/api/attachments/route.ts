/**
 * @swagger
 * /api/attachments:
 *   get:
 *     summary: List attachments, optionally filtered
 *     description: >
 *       Returns the join rows between a stored file and any entity. Filter by
 *       `targetType` + `targetId` to get one entity's attachments, or by `kind`
 *       / `category` across the lab.
 *     tags: [Attachments]
 *     parameters:
 *       - { in: query, name: targetType, schema: { type: string } }
 *       - { in: query, name: targetId, schema: { type: string } }
 *       - { in: query, name: kind, schema: { type: string, enum: [image, video, audio, document, data] } }
 *       - { in: query, name: category, schema: { type: string } }
 *     responses:
 *       200: { description: List of attachments }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Create an attachment or set one field
 *     description: >
 *       `method: create` links an already-uploaded file to a target resolved
 *       through the attachment-target registry, marks the file permanent and
 *       stamps the target logbook. `method: setfield` updates `caption`,
 *       `category`, `stepKey` or `order`.
 *     tags: [Attachments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method: { type: string, enum: [create, setfield] }
 *               fileId: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *               targetType: { type: string }
 *               targetId: { type: string }
 *               category: { type: string }
 *               kind: { type: string, enum: [image, video, audio, document, data] }
 *               caption: { type: string }
 *               stepKey: { type: string }
 *               responsible: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *               date: { type: string }
 *               id: { type: string }
 *               field: { type: string, enum: [caption, category, stepKey, order] }
 *               value: {}
 *     responses:
 *       200: { description: OK }
 *       400: { description: Invalid request or unknown method }
 *       401: { description: Unauthorized }
 *       404: { description: File or target not found }
 *   delete:
 *     summary: Delete an attachment, and its file if it was the last one
 *     tags: [Attachments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id]
 *             properties:
 *               id: { type: string }
 *     responses:
 *       200: { description: "{ message, fileDeleted, fileDocDeleted }" }
 *       400: { description: Invalid id }
 *       401: { description: Unauthorized }
 *       403: { description: Missing the attachments.delete capability }
 *       404: { description: Not found }
 */

import { runRoute } from "@/lib/effect";
import { listAttachments, handleAttachmentPost, deleteAttachment } from "./handlers";

export const GET = (request: Request) => runRoute(listAttachments(request));
export const POST = (request: Request) => runRoute(handleAttachmentPost(request));
export const DELETE = (request: Request) => runRoute(deleteAttachment(request));

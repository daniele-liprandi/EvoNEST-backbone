/**
 * @swagger
 * /api/files/{fileId}:
 *   get:
 *     summary: Stream a file by id
 *     tags: [Files]
 *     parameters:
 *       - { in: path, name: fileId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: The file stream }
 *       400: { description: Invalid id }
 *       401: { description: Unauthorized }
 *       404: { description: Not found on the database or disk }
 *   delete:
 *     summary: Delete a file by id and unlink it from its entry
 *     tags: [Files]
 *     parameters:
 *       - { in: path, name: fileId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: "{ success: true }" }
 *       400: { description: Invalid id }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */

import { runRoute } from "@/lib/effect";
import { streamFile, deleteFile } from "./handlers";

export const GET = async (_request: Request, props: { params: Promise<{ fileId: string }> }) => {
  const { fileId } = await props.params;
  return runRoute(streamFile(fileId));
};

export const DELETE = async (_request: Request, props: { params: Promise<{ fileId: string }> }) => {
  const { fileId } = await props.params;
  return runRoute(deleteFile(fileId));
};

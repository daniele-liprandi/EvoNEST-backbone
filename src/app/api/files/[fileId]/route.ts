/**
 * @swagger
 * /api/files/{fileId}:
 *   get:
 *     summary: Stream a file by id
 *     description: >
 *       Supports HTTP `Range` (partial `206` responses) for GridFS-backed files,
 *       with `Accept-Ranges`, an `ETag` (the sha256) and a long `Cache-Control`.
 *     tags: [Files]
 *     parameters:
 *       - { in: path, name: fileId, required: true, schema: { type: string } }
 *       - { in: header, name: Range, required: false, schema: { type: string } }
 *     responses:
 *       200: { description: The file stream }
 *       206: { description: A byte range of the file }
 *       304: { description: ETag matched If-None-Match }
 *       400: { description: Invalid id }
 *       401: { description: Unauthorized }
 *       404: { description: Not found on the database or storage }
 *       416: { description: Range not satisfiable }
 *   delete:
 *     summary: Delete a file by id and unlink it from its entry
 *     description: >
 *       Removes the GridFS blob (or the disk file, for legacy records) and the
 *       file document.
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

export const GET = async (request: Request, props: { params: Promise<{ fileId: string }> }) => {
  const { fileId } = await props.params;
  return runRoute(streamFile(fileId, request));
};

export const DELETE = async (_request: Request, props: { params: Promise<{ fileId: string }> }) => {
  const { fileId } = await props.params;
  return runRoute(deleteFile(fileId));
};

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: List file documents (newest first, paginated)
 *     tags: [Files]
 *     parameters:
 *       - { in: query, name: limit, schema: { type: integer, default: 50, maximum: 200 } }
 *       - { in: query, name: cursor, schema: { type: string }, description: "`nextCursor` from the previous page (a file `_id`)" }
 *       - { in: query, name: backend, schema: { type: string, enum: [gridfs, external] } }
 *       - { in: query, name: kind, schema: { type: string, enum: [image, video, audio, document, data] } }
 *     responses:
 *       200: { description: "{ files: [...], nextCursor: string | null }" }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Upload a file into the NEST (GridFS)
 *     description: >
 *       multipart/form-data with a `file` part and a JSON `metadata` part. The
 *       body is streamed into GridFS and hashed; an upload whose sha256 already
 *       exists is dropped and the existing file id returned.
 *       `metadata.deferredLink` stores the file unlinked for a later
 *       `/api/files/link`; otherwise `metadata.entryType` + `entryId` link it
 *       immediately. Size caps: 20 MB for image/document/data, 200 MB for
 *       video/audio.
 *     tags: [Files]
 *     responses:
 *       200: { description: "{ fileId }" }
 *       400: { description: Missing file, unsupported type, over the size cap, or bad metadata }
 *       401: { description: Unauthorized }
 *       403: { description: Missing the files.upload capability }
 *       404: { description: The entry to link to was not found }
 */

import { runRoute } from "@/lib/effect";
import { listFiles, uploadFile } from "./handlers";

// The upload handler reads multipart form data, which must not be statically
// optimised.
export const dynamic = "force-dynamic";

export const GET = (request: Request) => runRoute(listFiles(request));
export const POST = (request: Request) => runRoute(uploadFile(request));

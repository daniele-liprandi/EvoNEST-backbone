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
 *     summary: Upload a file into the NEST (GridFS), or manage an external link
 *     description: >
 *       A `multipart/form-data` body is a file upload: the bytes are streamed
 *       into GridFS and hashed; an upload whose sha256 already exists is dropped
 *       and the existing file id returned. `metadata.deferredLink` stores the
 *       file unlinked for a later `/api/files/link`; otherwise
 *       `metadata.entryType` + `entryId` link it immediately. Size caps: 20 MB
 *       for image/document/data, 200 MB for video/audio.
 *       A `application/json` body with a `method` manages external file links:
 *       `link-external` ({ path, context?, mime?, name? } — registers a file
 *       left where it lives, needs `files.link-external`), `check` ({ id } —
 *       stats the path if the server can reach it, records
 *       `lastCheckedStatus`), `set-path` ({ id, path } — re-point the link),
 *       `import` ({ id } — stream the external file into GridFS once, needs
 *       `files.upload`).
 *     tags: [Files]
 *     responses:
 *       200: { description: "{ fileId }" }
 *       400: { description: Missing file, unsupported type, over the size cap, or bad metadata }
 *       401: { description: Unauthorized }
 *       403: { description: Missing the files.upload capability }
 *       404: { description: The entry to link to was not found }
 */

import { runRoute } from "@/lib/effect";
import { listFiles, uploadFile, handleFilesPost } from "./handlers";

// The upload handler reads multipart form data, which must not be statically
// optimised.
export const dynamic = "force-dynamic";

export const GET = (request: Request) => runRoute(listFiles(request));

export const POST = (request: Request) => {
  const contentType = request.headers.get("content-type") || "";
  return contentType.includes("multipart/form-data")
    ? runRoute(uploadFile(request))
    : runRoute(handleFilesPost(request));
};

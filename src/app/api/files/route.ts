/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: Retrieve all file documents
 *     tags: [Files]
 *     responses:
 *       200: { description: List of files }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Upload a file
 *     description: >
 *       multipart/form-data with `file`, `type` and a JSON `metadata` part.
 *       `metadata.deferredLink` stores the file in a temp location for later
 *       linking; otherwise `metadata.entryType` + `entryId` link it immediately.
 *     tags: [Files]
 *     responses:
 *       200: { description: "{ fileId }" }
 *       400: { description: Missing file, bad type/size, or bad metadata }
 *       401: { description: Unauthorized }
 *       404: { description: The entry to link to was not found }
 */

import { runRoute } from "@/lib/effect";
import { listFiles, uploadFile } from "./handlers";

// The upload handler reads multipart form data, which must not be statically
// optimised.
export const dynamic = "force-dynamic";

export const GET = () => runRoute(listFiles);
export const POST = (request: Request) => runRoute(uploadFile(request));

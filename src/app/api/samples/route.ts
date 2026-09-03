/**
 * @swagger
 * /api/samples:
 *   get:
 *     summary: Retrieve all samples
 *     tags: [Samples]
 *     parameters:
 *       - in: query
 *         name: related
 *         schema: { type: boolean }
 *         description: Attach the parent-sample chain to each sample
 *     responses:
 *       200: { description: List of samples }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 *   post:
 *     summary: Create or modify a sample
 *     description: >
 *       Body without `method`, or `method: create`, creates a sample.
 *       `method: update | setfield | incrementfield` modifies one.
 *       `method: get-schema` returns the inferred sample schema. A type's
 *       configured `fields` are read from the `fields` bag on create and update.
 *     tags: [Samples]
 *     responses:
 *       200: { description: Operation successful }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Protected field }
 *       404: { description: Sample or parent not found }
 *       500: { description: Server error }
 *   delete:
 *     summary: Delete a sample
 *     tags: [Samples]
 *     responses:
 *       200: { description: Deleted }
 *       400: { description: Invalid id }
 *       403: { description: Missing the samples.delete capability }
 *       404: { description: Not found }
 */

import { runRoute } from "@/lib/effect";
import { listSamples, handleSamplePost, deleteSample } from "./handlers";

export const GET = (request: Request) => runRoute(listSamples(request));
export const POST = (request: Request) => runRoute(handleSamplePost(request));
export const DELETE = (request: Request) => runRoute(deleteSample(request));

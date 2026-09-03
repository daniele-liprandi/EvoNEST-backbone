/**
 * @swagger
 * /api/experiments:
 *   get:
 *     summary: Retrieve experiments
 *     tags: [Experiments]
 *     parameters:
 *       - { in: query, name: includeRawData, schema: { type: boolean } }
 *       - { in: query, name: includeOriginalData, schema: { type: boolean } }
 *       - { in: query, name: includeTraitsData, schema: { type: boolean } }
 *       - { in: query, name: related, schema: { type: boolean } }
 *       - { in: query, name: type, schema: { type: string } }
 *     responses:
 *       200: { description: List of experiments }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Create an experiment or set one field
 *     description: "`method: create` inserts an experiment (and any embedded traits) and stamps the sample. `method: setfield` updates one field."
 *     tags: [Experiments]
 *     responses:
 *       200: { description: OK }
 *       400: { description: Invalid request or unknown method }
 *       401: { description: Unauthorized }
 *       404: { description: Experiment not found }
 *   delete:
 *     summary: Delete an experiment and its attached file
 *     tags: [Experiments]
 *     responses:
 *       200: { description: "{ message, fileDeleted, fileDocDeleted }" }
 *       400: { description: Invalid id }
 *       401: { description: Unauthorized }
 *       403: { description: Missing the experiments.delete capability }
 *       404: { description: Not found }
 */

import { runRoute } from "@/lib/effect";
import { listExperiments, handleExperimentPost, deleteExperiment } from "./handlers";

export const GET = (request: Request) => runRoute(listExperiments(request));
export const POST = (request: Request) => runRoute(handleExperimentPost(request));
export const DELETE = (request: Request) => runRoute(deleteExperiment(request));

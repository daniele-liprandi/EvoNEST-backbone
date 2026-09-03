/**
 * @swagger
 * /api/nlfilter:
 *   post:
 *     summary: Turn a natural-language query into table filter parameters
 *     description: >
 *       Page mode (`columns`) returns `{ params }`; global mode (`routes`)
 *       returns `{ route, params }`. Backed by the configured LLM endpoint.
 *     tags: [Utilities]
 *     responses:
 *       200: { description: "{ params } or { route, params }" }
 *       400: { description: query is required }
 *       401: { description: Unauthorized }
 *       422: { description: The model did not return usable JSON }
 *       502: { description: The LLM request failed }
 *       503: { description: The LLM is not configured }
 */

import { runRoute } from "@/lib/effect";
import { runNlFilter } from "./handlers";

export const POST = (request: Request) => runRoute(runNlFilter(request));

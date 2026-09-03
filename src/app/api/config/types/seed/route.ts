/**
 * @swagger
 * /api/config/types/seed:
 *   post:
 *     summary: Seed the lab configuration from a preset or the shipped defaults
 *     description: >
 *       Replaces every config document. `configs` writes an explicit set (the
 *       AI-tailored setup); `preset` names a lab preset; neither uses the
 *       defaults. `labName` / `labDescription` are written to the main settings.
 *     tags: [Configuration]
 *     responses:
 *       200: { description: "{ message, results: [{ type, action }] }" }
 *       400: { description: Unknown preset }
 *       401: { description: Unauthorized }
 *       403: { description: Missing the config.seed capability }
 */

import { runRoute } from "@/lib/effect";
import { seedConfigs } from "./handlers";

export const POST = (request: Request) => runRoute(seedConfigs(request));

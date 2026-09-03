/**
 * @swagger
 * /api/config/types:
 *   get:
 *     summary: All configuration documents, or one by type
 *     tags: [Configuration]
 *     parameters:
 *       - { in: query, name: type, schema: { type: string } }
 *     responses:
 *       200: { description: Config document or array }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Modify configuration
 *     description: "`method`: additem | updateitem | deleteitem | seed | update. Requires config.edit (config.seed for seed)."
 *     tags: [Configuration]
 *     responses:
 *       200: { description: OK }
 *       400: { description: Unknown method }
 *       401: { description: Unauthorized }
 *       403: { description: Missing the config.edit / config.seed capability }
 *       404: { description: Item not found }
 *   delete:
 *     summary: Delete a configuration item, or a whole type when no value is given
 *     tags: [Configuration]
 *     responses:
 *       200: { description: Deleted }
 *       401: { description: Unauthorized }
 *       403: { description: Missing the config.edit capability }
 */

import { runRoute } from "@/lib/effect";
import { listConfig, handleConfigPost, deleteConfig } from "./handlers";

export const GET = (request: Request) => runRoute(listConfig(request));
export const POST = (request: Request) => runRoute(handleConfigPost(request));
export const DELETE = (request: Request) => runRoute(deleteConfig(request));

/**
 * @swagger
 * /api/config/roles:
 *   get:
 *     summary: Roles, the permission map and the capability list
 *     tags: [Configuration]
 *     responses:
 *       200: { description: "{ roles, permissions, capabilities }" }
 *   post:
 *     summary: Replace the roles list or the permission map
 *     tags: [Configuration]
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       403: { description: Not an administrator }
 */

import { runRoute } from "@/lib/effect";
import { getRolesConfig, handleRolesPost } from "./handlers";

export const GET = () => runRoute(getRolesConfig);
export const POST = (request: Request) => runRoute(handleRolesPost(request));

/**
 * @swagger
 * /api/user/role:
 *   get:
 *     summary: The current user's role, admin flag, and granted capabilities
 *     tags: [Users]
 *     responses:
 *       200: { description: "{ role, isAdmin, capabilities }" }
 *       401: { description: Not authenticated }
 */

import { runRoute } from "@/lib/effect";
import { getUserRole } from "./handlers";

export const GET = () => runRoute(getUserRole);

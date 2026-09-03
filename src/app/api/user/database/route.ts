/**
 * @swagger
 * /api/user/database:
 *   get:
 *     summary: The current user's databases and active database
 *     tags: [Users]
 *     responses:
 *       200: { description: "{ databases, activeDatabase }" }
 *       401: { description: Unauthorized }
 *       404: { description: User not found }
 *   post:
 *     summary: Switch the current user's active database
 *     tags: [Users]
 *     responses:
 *       200: { description: "{ success, activeDatabase }" }
 *       400: { description: Invalid body }
 *       401: { description: Unauthorized }
 *       403: { description: Database not authorized for user }
 *       404: { description: User not found }
 */

import { runRoute } from "@/lib/effect";
import { getUserDatabases, setActiveDatabase } from "./handlers";

export const GET = () => runRoute(getUserDatabases);
export const POST = (request: Request) => runRoute(setActiveDatabase(request));

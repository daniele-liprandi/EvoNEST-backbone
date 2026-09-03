/**
 * @swagger
 * /api/databases:
 *   get:
 *     summary: The databases available to assign to users
 *     tags: [Databases]
 *     responses:
 *       200: { description: "{ databases }" }
 *   post:
 *     summary: Add a database to the available list
 *     tags: [Databases]
 *     responses:
 *       200: { description: "{ message, database }" }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Requires the databases.manage capability }
 *       409: { description: Already exists }
 */

import { runRoute } from "@/lib/effect";
import { listDatabases, addDatabase } from "./handlers";

export const GET = () => runRoute(listDatabases);
export const POST = (request: Request) => runRoute(addDatabase(request));

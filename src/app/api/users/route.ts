/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Retrieve users
 *     description: Scoped to the caller's active database, or all users with `?auth=true`.
 *     tags: [Users]
 *     parameters:
 *       - { in: query, name: auth, schema: { type: boolean }, description: Return every user, unfiltered }
 *     responses:
 *       200: { description: List of users }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Create or modify a user
 *     description: >
 *       `method: update | incrementfield | change_databases` require the
 *       users.manage capability. `method: setfield` is self-service (own record,
 *       protected-field list). No method, or an unknown one, creates a user
 *       (users.manage).
 *     tags: [Users]
 *     responses:
 *       200: { description: OK }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Missing the users.manage capability, or not your own record }
 *       404: { description: User not found }
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     responses:
 *       200: { description: Deleted }
 *       400: { description: Invalid id }
 *       401: { description: Unauthorized }
 *       403: { description: Missing the users.manage capability }
 *       404: { description: Not found }
 */

import { runRoute } from "@/lib/effect";
import { listUsers, handleUserPost, deleteUser } from "./handlers";

export const GET = (request: Request) => runRoute(listUsers(request));
export const POST = (request: Request) => runRoute(handleUserPost(request));
export const DELETE = (request: Request) => runRoute(deleteUser(request));

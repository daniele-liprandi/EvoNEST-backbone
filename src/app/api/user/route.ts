/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: The current user's record
 *     tags: [Users]
 *     responses:
 *       200: { description: User document }
 *       401: { description: Unauthorized }
 *       404: { description: User not found }
 *   post:
 *     summary: Update a field on the current user's record
 *     tags: [Users]
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Invalid method or field }
 *       401: { description: Unauthorized }
 *       404: { description: User not found }
 */

import { runRoute } from "@/lib/effect";
import { getUser, updateUser } from "./handlers";

export const GET = () => runRoute(getUser);
export const POST = (request: Request) => runRoute(updateUser(request));

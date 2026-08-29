import { Effect } from "effect";
import { runRoute, ok, Auth } from "@/lib/effect";

/**
 * @swagger
 * /api/user/role:
 *   get:
 *     summary: Check current user's role
 *     description: Returns whether the authenticated user has the admin role
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: Role information retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isAdmin:
 *                   type: boolean
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */

export const checkAdmin = Effect.gen(function* () {
  const user = yield* Effect.flatMap(Auth, (auth) => auth.currentUser);
  return yield* ok({ isAdmin: user.role === "admin" });
});

export const GET = () => runRoute(checkAdmin);

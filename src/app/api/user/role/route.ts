import { Effect } from "effect";
import { runRoute, ok, currentUser } from "@/lib/effect";

/**
 * @swagger
 * /api/user/role:
 *   get:
 *     summary: Whether the current user has the admin role
 *     tags: [Users]
 *     responses:
 *       200: { description: "{ isAdmin: boolean }" }
 *       401: { description: Not authenticated }
 */
export const getUserRole = Effect.gen(function* () {
  const user = yield* currentUser;
  return yield* ok({ isAdmin: user.role === "admin" });
});

export const GET = () => runRoute(getUserRole);

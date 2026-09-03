import { Effect } from "effect";
import { ok, currentSession, Mongo } from "@/lib/effect";

/**
 * @swagger
 * /api/auth/usercontrol:
 *   get:
 *     summary: The session user and their database record, if they have one
 *     description: >
 *       `needsIdentification` is true when the signed-in account is not yet
 *       linked to a user document, so the UI can prompt for the link.
 *     tags: [Users]
 *     responses:
 *       200: { description: "{ user, dbuser?, needsIdentification }" }
 *       401: { description: Unauthorized }
 */

export const getUserControl = Effect.gen(function* () {
  const user = yield* currentSession;
  const mongo = yield* Mongo;

  const dbuser = yield* mongo.findOne("usersdb", "users", { auth0id: user.sub });
  return yield* ok(
    dbuser
      ? { user, dbuser, needsIdentification: false }
      : { user, needsIdentification: true },
  );
});

import { Effect, Schema } from "effect";
import { ok, decodeBody, currentSession, Mongo, requireFound } from "@/lib/effect";

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

const USERS_DB = "usersdb";
const USERS = "users";

// The user edits their own record, so only self-service fields are writable
// here. Role and database membership are set by an admin through other routes.
const EDITABLE_FIELDS = ["name", "email"] as const;

export const getUser = Effect.gen(function* () {
  const { sub } = yield* currentSession;
  const mongo = yield* Mongo;
  const user = yield* mongo
    .findOne(USERS_DB, USERS, { auth0id: sub })
    .pipe(Effect.flatMap(requireFound("User", sub)));
  return yield* ok(user);
});

const UpdateBody = Schema.Struct({
  method: Schema.Literal("setfield"),
  field: Schema.Literal(...EDITABLE_FIELDS),
  value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean),
});

export const updateUser = (request: Request) =>
  Effect.gen(function* () {
    const { sub } = yield* currentSession;
    const { field, value } = yield* decodeBody(UpdateBody)(request);
    const mongo = yield* Mongo;

    const now = new Date().toISOString();
    const result = yield* mongo.updateOne(
      USERS_DB,
      USERS,
      { auth0id: sub },
      { $set: { [field]: value, recentChangeDate: now } },
    );
    yield* requireFound("User", sub)(result.matchedCount > 0 ? result : null);
    return yield* ok({ message: "User updated successfully" });
  });

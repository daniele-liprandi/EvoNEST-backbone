import { Effect, Schema } from "effect";
import {
  runRoute,
  ok,
  decodeBody,
  Auth,
  Mongo,
  requireFound,
  NonEmptyString,
  ForbiddenError,
} from "@/lib/effect";

/**
 * @swagger
 * /api/user/database:
 *   get:
 *     summary: Get user's database access information
 *     description: Retrieve list of databases the user has access to and their currently active database
 *     tags:
 *       - Users
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Database information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 databases:
 *                   type: array
 *                   items:
 *                     type: string
 *                 activeDatabase:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 *   post:
 *     summary: Set active database for user
 *     description: Switch the user's active database to a different one they have access to
 *     tags:
 *       - Users
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - database
 *             properties:
 *               database:
 *                 type: string
 *     responses:
 *       200:
 *         description: Active database updated successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Database not authorized for user
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

const findUser = (sub: string) =>
  Effect.flatMap(Mongo, (mongo) => mongo.findOne("usersdb", "users", { auth0id: sub })).pipe(
    Effect.flatMap(requireFound("User", sub)),
  );

/** GET handler as an Effect, exported for tests. */
export const getDatabases = Effect.gen(function* () {
  const session = yield* Effect.flatMap(Auth, (auth) => auth.session);
  const user = yield* findUser(session.sub);
  return yield* ok({
    databases: (user.databases as string[]) ?? [],
    activeDatabase: user.activeDatabase,
  });
});

const SetActiveBody = Schema.Struct({ database: NonEmptyString });

/** POST handler as an Effect, exported for tests. */
export const setActiveDatabase = (request: Request) =>
  Effect.gen(function* () {
    const session = yield* Effect.flatMap(Auth, (auth) => auth.session);
    const { database } = yield* decodeBody(SetActiveBody)(request);
    const user = yield* findUser(session.sub);

    const allowed = (user.databases as string[]) ?? [];
    if (!allowed.includes(database)) {
      return yield* Effect.fail(new ForbiddenError({ message: "Database not authorized for user" }));
    }

    const mongo = yield* Mongo;
    const logbookEntry = `${new Date().toISOString()}: changed active database to ${database}`;
    yield* mongo.updateOne(
      "usersdb",
      "users",
      { auth0id: session.sub },
      {
        $set: { activeDatabase: database, recentChangeDate: new Date().toISOString() },
        $push: { logbook: logbookEntry },
      },
    );

    return yield* ok({ success: true, activeDatabase: database });
  });

export const GET = () => runRoute(getDatabases);
export const POST = (request: Request) => runRoute(setActiveDatabase(request));

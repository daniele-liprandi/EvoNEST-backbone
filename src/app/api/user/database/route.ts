import { Effect, Schema } from "effect";
import { runRoute, ok, decodeBody, currentSession, Mongo, requireFound, NonEmptyString, ForbiddenError } from "@/lib/effect";

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

const findUser = (sub: string) =>
  Effect.flatMap(Mongo, (mongo) => mongo.findOne("usersdb", "users", { auth0id: sub })).pipe(
    Effect.flatMap(requireFound("User", sub)),
  );

export const getUserDatabases = Effect.gen(function* () {
  const { sub } = yield* currentSession;
  const user = yield* findUser(sub);
  return yield* ok({ databases: (user.databases as string[]) ?? [], activeDatabase: user.activeDatabase });
});

const SetActiveBody = Schema.Struct({ database: NonEmptyString });

export const setActiveDatabase = (request: Request) =>
  Effect.gen(function* () {
    const { sub } = yield* currentSession;
    const { database } = yield* decodeBody(SetActiveBody)(request);
    const user = yield* findUser(sub);
    const mongo = yield* Mongo;

    if (!((user.databases as string[]) ?? []).includes(database)) {
      return yield* Effect.fail(new ForbiddenError({ message: "Database not authorized for user" }));
    }

    const now = new Date().toISOString();
    yield* mongo.updateOne(
      "usersdb",
      "users",
      { auth0id: sub },
      {
        $set: { activeDatabase: database, recentChangeDate: now },
        $push: { logbook: `${now}: changed active database to ${database}` },
      },
    );
    return yield* ok({ success: true, activeDatabase: database });
  });

export const GET = () => runRoute(getUserDatabases);
export const POST = (request: Request) => runRoute(setActiveDatabase(request));

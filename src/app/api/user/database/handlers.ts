import { Effect, Schema } from "effect";
import { ok, decodeBody, currentSession, Mongo, requireFound, NonEmptyString, ForbiddenError } from "@/lib/effect";

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

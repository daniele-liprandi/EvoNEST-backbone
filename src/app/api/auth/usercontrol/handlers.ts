import { Effect } from "effect";
import { ok, currentSession, Mongo } from "@/lib/effect";

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

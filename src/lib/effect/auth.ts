import { Context, Effect, Layer } from "effect";
import type { Document } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { Mongo, attempt } from "./db";
import { ForbiddenError, InternalError, UnauthorizedError } from "./errors";

export interface SessionUser {
  readonly sub: string;
  readonly name: string | null;
}

export interface CurrentUser {
  readonly sub: string;
  readonly name: string | null;
  readonly role: string | null;
  readonly activeDatabase: string;
  readonly databases: ReadonlyArray<string>;
  /** The raw user document, for code not yet migrated off `get_current_user`. */
  readonly doc: Document;
}

/**
 * Authentication as an Effect service. A handler declares `Auth` in its
 * requirements instead of calling `getServerSession` / `get_database_user` /
 * `check_user_role` directly. Failures are typed: no session is a 401, the
 * wrong role is a 403.
 */
export class Auth extends Context.Tag("Auth")<
  Auth,
  {
    readonly session: Effect.Effect<SessionUser, UnauthorizedError>;
    readonly currentUser: Effect.Effect<CurrentUser, UnauthorizedError | InternalError>;
    readonly databaseName: Effect.Effect<string, UnauthorizedError | InternalError>;
    readonly requireRole: (
      role: string,
    ) => Effect.Effect<CurrentUser, UnauthorizedError | ForbiddenError | InternalError>;
  }
>() {}

/** The session for the current request. Fails with `UnauthorizedError`. */
export const currentSession = Effect.flatMap(Auth, (a) => a.session);

/** The current user's record. */
export const currentUser = Effect.flatMap(Auth, (a) => a.currentUser);

/** The current user's active database name. */
export const currentDatabase = Effect.flatMap(Auth, (a) => a.databaseName);

/** Require the current user to hold `role`, else `ForbiddenError`. */
export const requireRole = (role: string) => Effect.flatMap(Auth, (a) => a.requireRole(role));

/**
 * Allow the request through if it carries the mastra service key, otherwise
 * require a session. For routes the middleware does not protect that the
 * service and the browser both call.
 */
export const sessionOrService = (request: Request) => {
  const secret = process.env.MASTRA_SERVICE_SECRET;
  if (secret && request.headers.get("x-service-key") === secret) return Effect.void;
  return Effect.asVoid(currentSession);
};

const readSession: Effect.Effect<SessionUser, UnauthorizedError> = attempt(
  () => getServerSession(authOptions),
  "getServerSession",
).pipe(
  Effect.catchAll(() => Effect.succeed(null)),
  Effect.flatMap((session) =>
    session?.user?.sub
      ? Effect.succeed({ sub: session.user.sub as string, name: (session.user.name as string) ?? null })
      : Effect.fail(new UnauthorizedError({})),
  ),
);

export const AuthLive = Layer.effect(
  Auth,
  Effect.gen(function* () {
    const mongo = yield* Mongo;

    // The layer is rebuilt per request, so caching here scopes to one request:
    // a handler reading currentDatabase, currentUser and requireRole hits
    // getServerSession and the users collection once each, not three times.
    const loadSession = yield* Effect.cached(readSession);

    const currentUser = yield* Effect.cached(
      Effect.gen(function* () {
        const session = yield* loadSession;
        const users = yield* mongo.collection("usersdb", "users");
        const doc = yield* attempt(
          () => users.findOne({ auth0id: session.sub }),
          "users.findOne",
        );
        if (!doc) {
          return yield* Effect.fail(new UnauthorizedError({ message: "User record not found" }));
        }
        return {
          sub: session.sub,
          name: session.name,
          role: (doc.role as string) ?? null,
          activeDatabase: doc.activeDatabase as string,
          databases: (doc.databases as string[]) ?? [],
          doc,
        } satisfies CurrentUser;
      }),
    );

    return Auth.of({
      session: loadSession,
      currentUser,
      databaseName: currentUser.pipe(Effect.map((u) => u.activeDatabase)),
      requireRole: (role) =>
        currentUser.pipe(
          Effect.flatMap((user) =>
            user.role === role
              ? Effect.succeed(user)
              : Effect.fail(new ForbiddenError({ message: `Requires the ${role} role` })),
          ),
        ),
    });
  }),
);

/** Build an `Auth` layer with a fixed user, for tests. */
export const testAuth = (user: Partial<CurrentUser> & Pick<CurrentUser, "sub">) => {
  const full: CurrentUser = {
    name: null,
    role: null,
    activeDatabase: "testdb",
    databases: ["testdb"],
    doc: {},
    ...user,
  };
  return Layer.succeed(
    Auth,
    Auth.of({
      session: Effect.succeed({ sub: full.sub, name: full.name }),
      currentUser: Effect.succeed(full),
      databaseName: Effect.succeed(full.activeDatabase),
      requireRole: (role) =>
        full.role === role
          ? Effect.succeed(full)
          : Effect.fail(new ForbiddenError({ message: `Requires the ${role} role` })),
    }),
  );
};

/** An `Auth` layer that always fails as unauthenticated, for tests. */
export const testNoAuth = Layer.succeed(
  Auth,
  Auth.of({
    session: Effect.fail(new UnauthorizedError({})),
    currentUser: Effect.fail(new UnauthorizedError({})),
    databaseName: Effect.fail(new UnauthorizedError({})),
    requireRole: () => Effect.fail(new UnauthorizedError({})),
  }),
);

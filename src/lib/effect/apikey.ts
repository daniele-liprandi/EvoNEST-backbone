import { Effect } from "effect";
import type { Document } from "mongodb";
import { Mongo } from "./db";
import { InternalError, UnauthorizedError, ValidationError } from "./errors";

export interface ApiKeyGrant {
  /** The database the key was validated against (the `?database=` query param). */
  readonly database: string;
  /** The user record that owns the key. */
  readonly user: Document;
}

interface StoredKey {
  readonly key: string;
  readonly isActive: boolean;
  readonly expiresAt?: string;
}

const keyFromHeaders = (request: Request): string | null => {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return request.headers.get("x-api-key");
};

/**
 * Authenticate an export request by API key. The key travels in a header
 * (`Authorization: Bearer <key>` or `X-API-Key`); the target database is the
 * `?database=` query parameter. Unlike session auth this resolves a specific
 * user and a specific database, so it is a request helper rather than the
 * `Auth` service.
 */
export const apiKeyAuth = (
  request: Request,
): Effect.Effect<ApiKeyGrant, UnauthorizedError | ValidationError | InternalError, Mongo> =>
  Effect.gen(function* () {
    const database = new URL(request.url).searchParams.get("database");
    if (!database) {
      return yield* Effect.fail(
        new ValidationError({ message: "The 'database' query parameter is required" }),
      );
    }

    const key = keyFromHeaders(request);
    if (!key) {
      return yield* Effect.fail(
        new UnauthorizedError({
          message: "API key required in the Authorization or X-API-Key header",
        }),
      );
    }

    const mongo = yield* Mongo;
    const user = yield* mongo.findOne("usersdb", "users", {
      "apiKeys.key": key,
      "apiKeys.isActive": true,
      databases: database,
    });
    if (!user) {
      return yield* Effect.fail(
        new UnauthorizedError({ message: "Invalid API key or no access to that database" }),
      );
    }

    const record = (user.apiKeys as StoredKey[] | undefined)?.find(
      (k) => k.key === key && k.isActive,
    );
    if (record?.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return yield* Effect.fail(new UnauthorizedError({ message: "API key expired" }));
    }

    // Usage stats are best-effort: a failed write must not fail the request.
    yield* mongo
      .updateOne(
        "usersdb",
        "users",
        { _id: user._id, "apiKeys.key": key },
        {
          $set: { "apiKeys.$.lastUsedAt": new Date().toISOString() },
          $inc: { "apiKeys.$.usageCount": 1 },
        },
      )
      .pipe(Effect.catchAll(() => Effect.void));

    return { database, user } satisfies ApiKeyGrant;
  });

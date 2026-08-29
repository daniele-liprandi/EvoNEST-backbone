import { Context, Effect, Layer, Option } from "effect";
import type { Collection, Db, Document } from "mongodb";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { InternalError, NotFoundError } from "./errors";

/**
 * Database access as an Effect service. Handlers depend on `Mongo` and are
 * given the live implementation by `runRoute`; tests provide a stub layer.
 */
export class Mongo extends Context.Tag("Mongo")<
  Mongo,
  {
    readonly db: (name: string) => Effect.Effect<Db, InternalError>;
    readonly collection: (
      dbName: string,
      name: string,
    ) => Effect.Effect<Collection<Document>, InternalError>;
  }
>() {}

export const MongoLive = Layer.succeed(
  Mongo,
  Mongo.of({
    db: (name) =>
      Effect.tryPromise({
        try: async () => {
          const client = await get_or_create_client();
          if (!client) throw new Error("database client is not connected");
          return client.db(name);
        },
        catch: (cause) => new InternalError({ message: "database connection failed", cause }),
      }),
    collection: (dbName, name) =>
      Effect.tryPromise({
        try: async () => {
          const client = await get_or_create_client();
          if (!client) throw new Error("database client is not connected");
          return client.db(dbName).collection(name);
        },
        catch: (cause) => new InternalError({ message: "database connection failed", cause }),
      }),
  }),
);

/** Wrap a driver call, turning a rejection into an {@link InternalError}. */
export const attempt = <A>(op: () => Promise<A>, context: string): Effect.Effect<A, InternalError> =>
  Effect.tryPromise({
    try: op,
    catch: (cause) => new InternalError({ message: `database operation failed: ${context}`, cause }),
  });

/** Turn a nullable lookup result into a value or a {@link NotFoundError}. */
export const requireFound =
  (resource: string, id?: string) =>
  <A>(value: A | null | undefined): Effect.Effect<A, NotFoundError> =>
    Option.fromNullable(value).pipe(
      Effect.mapError(() => new NotFoundError({ resource, id })),
    );

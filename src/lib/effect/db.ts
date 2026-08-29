import { Context, Effect, Layer, Option } from "effect";
import type {
  Collection,
  Db,
  DeleteResult,
  Document,
  Filter,
  InsertOneResult,
  OptionalUnlessRequiredId,
  UpdateFilter,
  UpdateResult,
} from "mongodb";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { InternalError, NotFoundError } from "./errors";

/**
 * Database access as an Effect service. Handlers depend on `Mongo` and are
 * given the live implementation by `runRoute`; tests provide a stub layer.
 */
type Coll = Collection<Document>;

export class Mongo extends Context.Tag("Mongo")<
  Mongo,
  {
    readonly db: (name: string) => Effect.Effect<Db, InternalError>;
    readonly collection: (dbName: string, name: string) => Effect.Effect<Coll, InternalError>;

    readonly findOne: (
      dbName: string,
      name: string,
      filter: Filter<Document>,
    ) => Effect.Effect<Document | null, InternalError>;

    readonly find: (
      dbName: string,
      name: string,
      filter?: Filter<Document>,
      options?: { readonly limit?: number; readonly sort?: Record<string, 1 | -1> },
    ) => Effect.Effect<Document[], InternalError>;

    readonly insertOne: (
      dbName: string,
      name: string,
      doc: OptionalUnlessRequiredId<Document>,
    ) => Effect.Effect<InsertOneResult<Document>, InternalError>;

    readonly updateOne: (
      dbName: string,
      name: string,
      filter: Filter<Document>,
      update: UpdateFilter<Document> | Partial<Document>,
    ) => Effect.Effect<UpdateResult, InternalError>;

    readonly deleteOne: (
      dbName: string,
      name: string,
      filter: Filter<Document>,
    ) => Effect.Effect<DeleteResult, InternalError>;
  }
>() {}

const connect = () =>
  Effect.tryPromise({
    try: async () => {
      const client = await get_or_create_client();
      if (!client) throw new Error("database client is not connected");
      return client;
    },
    catch: (cause) => new InternalError({ message: "database connection failed", cause }),
  });

const getCollection = (dbName: string, name: string) =>
  connect().pipe(Effect.map((client) => client.db(dbName).collection(name)));

const op = <A>(
  dbName: string,
  name: string,
  label: string,
  run: (collection: Coll) => Promise<A>,
): Effect.Effect<A, InternalError> =>
  getCollection(dbName, name).pipe(
    Effect.flatMap((collection) =>
      Effect.tryPromise({
        try: () => run(collection),
        catch: (cause) => new InternalError({ message: `database operation failed: ${label}`, cause }),
      }),
    ),
  );

export const MongoLive = Layer.succeed(
  Mongo,
  Mongo.of({
    db: (name) => connect().pipe(Effect.map((client) => client.db(name))),
    collection: (dbName, name) => getCollection(dbName, name),
    findOne: (dbName, name, filter) => op(dbName, name, `${name}.findOne`, (c) => c.findOne(filter)),
    find: (dbName, name, filter = {}, options = {}) =>
      op(dbName, name, `${name}.find`, (c) => {
        let cursor = c.find(filter);
        if (options.sort) cursor = cursor.sort(options.sort);
        if (options.limit) cursor = cursor.limit(options.limit);
        return cursor.toArray();
      }),
    insertOne: (dbName, name, doc) => op(dbName, name, `${name}.insertOne`, (c) => c.insertOne(doc)),
    updateOne: (dbName, name, filter, update) =>
      op(dbName, name, `${name}.updateOne`, (c) =>
        c.updateOne(filter, update as UpdateFilter<Document>),
      ),
    deleteOne: (dbName, name, filter) =>
      op(dbName, name, `${name}.deleteOne`, (c) => c.deleteOne(filter)),
  }),
);

/** Wrap a driver call, turning a rejection into an {@link InternalError}. */
export const attempt = <A>(fn: () => Promise<A>, context: string): Effect.Effect<A, InternalError> =>
  Effect.tryPromise({
    try: fn,
    catch: (cause) => new InternalError({ message: `database operation failed: ${context}`, cause }),
  });

type MongoService = Context.Tag.Service<Mongo>;

/**
 * A `Mongo` layer for tests. Every method rejects unless overridden, so a test
 * only stubs what it exercises.
 */
export const testMongo = (impl: Partial<MongoService> = {}) =>
  Layer.succeed(
    Mongo,
    Mongo.of({
      db: () => Effect.die("Mongo.db not stubbed"),
      collection: () => Effect.die("Mongo.collection not stubbed"),
      findOne: () => Effect.die("Mongo.findOne not stubbed"),
      find: () => Effect.die("Mongo.find not stubbed"),
      insertOne: () => Effect.die("Mongo.insertOne not stubbed"),
      updateOne: () => Effect.die("Mongo.updateOne not stubbed"),
      deleteOne: () => Effect.die("Mongo.deleteOne not stubbed"),
      ...impl,
    }),
  );

/** Turn a nullable lookup result into a value or a {@link NotFoundError}. */
export const requireFound =
  (resource: string, id?: string) =>
  <A>(value: A | null | undefined): Effect.Effect<A, NotFoundError> =>
    Option.fromNullable(value).pipe(
      Effect.mapError(() => new NotFoundError({ resource, id })),
    );

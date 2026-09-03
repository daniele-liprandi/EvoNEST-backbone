import { Effect, Schema } from "effect";
import { ok, decodeBody, requireCapability, Mongo, NonEmptyString, ConflictError } from "@/lib/effect";

const SETTINGS_DB = "systemdb";
const DEFAULT_DATABASES = ["admin", "evonest"];

const readDatabaseNames = Effect.gen(function* () {
  const mongo = yield* Mongo;
  const existing = yield* mongo.findOne(SETTINGS_DB, "settings", { type: "databases" });
  if (existing) return (existing.databases as string[]) ?? [];

  const now = new Date().toISOString();
  yield* mongo.insertOne(SETTINGS_DB, "settings", {
    type: "databases",
    databases: DEFAULT_DATABASES,
    createdDate: now,
    lastModified: now,
  });
  return DEFAULT_DATABASES;
});

export const listDatabases = readDatabaseNames.pipe(Effect.flatMap((databases) => ok({ databases })));

const AddBody = Schema.Struct({ database: NonEmptyString });

export const addDatabase = (request: Request) =>
  Effect.gen(function* () {
    yield* requireCapability("databases.manage");
    const { database } = yield* decodeBody(AddBody)(request);
    const name = database.trim().toLowerCase();
    const mongo = yield* Mongo;
    const now = new Date().toISOString();

    const existing = yield* mongo.findOne(SETTINGS_DB, "settings", { type: "databases" });
    if (!existing) {
      yield* mongo.insertOne(SETTINGS_DB, "settings", {
        type: "databases",
        databases: [name],
        createdDate: now,
        lastModified: now,
      });
    } else if (((existing.databases as string[]) ?? []).includes(name)) {
      return yield* Effect.fail(new ConflictError({ message: "Database already exists" }));
    } else {
      yield* mongo.updateOne(
        SETTINGS_DB,
        "settings",
        { type: "databases" },
        { $push: { databases: name }, $set: { lastModified: now } },
      );
    }

    return yield* ok({ message: "Database added successfully", database: name });
  });

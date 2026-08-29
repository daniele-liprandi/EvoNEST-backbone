import { Effect, Schema } from "effect";
import { runRoute, ok, decodeBody, requireRole, Mongo, NonEmptyString, ConflictError } from "@/lib/effect";

/**
 * @swagger
 * /api/databases:
 *   get:
 *     summary: The databases available to assign to users
 *     tags: [Databases]
 *     responses:
 *       200: { description: "{ databases }" }
 *   post:
 *     summary: Add a database to the available list (admin only)
 *     tags: [Databases]
 *     responses:
 *       200: { description: "{ message, database }" }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Admin only }
 *       409: { description: Already exists }
 */

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
    yield* requireRole("admin");
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

export const GET = () => runRoute(listDatabases);
export const POST = (request: Request) => runRoute(addDatabase(request));

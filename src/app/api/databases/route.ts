import { Effect, Schema } from "effect";
import { runRoute, ok, decodeBody, Auth, Mongo, NonEmptyString, ConflictError } from "@/lib/effect";

/**
 * @swagger
 * /api/databases:
 *   get:
 *     summary: Get available databases
 *     description: List the databases that can be assigned to users
 *     tags:
 *       - Databases
 *     responses:
 *       200:
 *         description: Database list retrieved
 *       500:
 *         description: Server error
 *   post:
 *     summary: Add a new database
 *     description: Add a database to the available list (admin only)
 *     tags:
 *       - Databases
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [database]
 *             properties:
 *               database:
 *                 type: string
 *     responses:
 *       200:
 *         description: Database added
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin only
 *       409:
 *         description: Database already exists
 *       500:
 *         description: Server error
 */

const SETTINGS_DB = "systemdb";
const DEFAULT_DATABASES = ["admin", "evonest"];

const readDatabaseNames = Effect.gen(function* () {
  const mongo = yield* Mongo;
  const existing = yield* mongo.findOne(SETTINGS_DB, "settings", { type: "databases" });
  if (existing) return (existing.databases as string[]) ?? [];

  yield* mongo.insertOne(SETTINGS_DB, "settings", {
    type: "databases",
    databases: DEFAULT_DATABASES,
    createdDate: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  });
  return DEFAULT_DATABASES;
});

export const listDatabases = readDatabaseNames.pipe(Effect.flatMap((databases) => ok({ databases })));

const AddBody = Schema.Struct({ database: NonEmptyString });

export const addDatabase = (request: Request) =>
  Effect.gen(function* () {
    yield* Effect.flatMap(Auth, (auth) => auth.requireRole("admin"));
    const { database } = yield* decodeBody(AddBody)(request);
    const name = database.trim().toLowerCase();

    const mongo = yield* Mongo;
    const existing = yield* mongo.findOne(SETTINGS_DB, "settings", { type: "databases" });

    if (!existing) {
      yield* mongo.insertOne(SETTINGS_DB, "settings", {
        type: "databases",
        databases: [name],
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      });
    } else {
      if (((existing.databases as string[]) ?? []).includes(name)) {
        return yield* Effect.fail(new ConflictError({ message: "Database already exists" }));
      }
      yield* mongo.updateOne(
        SETTINGS_DB,
        "settings",
        { type: "databases" },
        { $push: { databases: name }, $set: { lastModified: new Date().toISOString() } },
      );
    }

    return yield* ok({ message: "Database added successfully", database: name });
  });

export const GET = () => runRoute(listDatabases);
export const POST = (request: Request) => runRoute(addDatabase(request));

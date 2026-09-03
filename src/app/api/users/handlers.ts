import { Effect, Schema } from "effect";
import { ObjectId } from "mongodb";
import {
  ok,
  decodeBody,
  currentSession,
  currentDatabase,
  currentUser,
  userCan,
  requireCapability,
  Mongo,
  ValidationError,
  ForbiddenError,
  NotFoundError,
  InternalError,
} from "@/lib/effect";

const USERS_DB = "usersdb";
const USERS = "users";
const SYSTEM_DB = "systemdb";

const stamp = () => new Date().toISOString();
const isHexId = (v: unknown): v is string =>
  typeof v === "string" && ObjectId.isValid(v) && new ObjectId(v).toHexString() === v;

const SETFIELD_PROTECTED = new Set([
  "_id",
  "role",
  "databases",
  "activeDatabase",
  "auth0id",
  "apiKeys",
  "isActive",
  "createdDate",
  "recentChangeDate",
  "logbook",
]);
const ID_METHODS = new Set(["update", "setfield", "incrementfield", "change_databases"]);
const MANAGE_METHODS = new Set(["update", "incrementfield", "change_databases"]);

// --- GET -------------------------------------------------------------------

export const listUsers = (request: Request) =>
  Effect.gen(function* () {
    yield* currentSession;
    const isAuth = new URL(request.url).searchParams.get("auth") === "true";
    const mongo = yield* Mongo;
    const users = yield* mongo.find(USERS_DB, USERS);

    // The auth/admin view wants every user; the normal view is scoped to the
    // caller's active database.
    if (isAuth) return yield* ok(users);
    const dbName = yield* currentDatabase;
    if (!dbName) return yield* ok(users);
    return yield* ok(users.filter((u) => Array.isArray(u.databases) && u.databases.includes(dbName)));
  });

// --- POST -----------------------------------------------------------------

const PostBody = Schema.Struct(
  {
    method: Schema.optional(Schema.String),
    id: Schema.optional(Schema.String),
    field: Schema.optional(Schema.String),
    value: Schema.optional(Schema.Unknown),
    databases: Schema.optional(Schema.Array(Schema.String)),
    name: Schema.optional(Schema.String),
    email: Schema.optional(Schema.String),
    role: Schema.optional(Schema.String),
    institution: Schema.optional(Schema.String),
  },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);
type PostData = Schema.Schema.Type<typeof PostBody>;

/** Reject any requested database the system doesn't know about. */
const validateDatabases = (requested: ReadonlyArray<string> | undefined) =>
  Effect.gen(function* () {
    if (!requested || requested.length === 0) return;
    const mongo = yield* Mongo;
    const settings = yield* mongo.findOne(SYSTEM_DB, "settings", { type: "databases" });
    const available = (settings?.databases as string[]) ?? ["admin", "evonest"];
    const invalid = requested.filter((db) => !available.includes(db));
    if (invalid.length > 0) {
      return yield* Effect.fail(
        new ValidationError({
          message: `Invalid databases: ${invalid.join(", ")}. Available databases: ${available.join(", ")}`,
        }),
      );
    }
  });

const requireModified = (result: { modifiedCount: number }, message: string) =>
  result.modifiedCount === 0
    ? Effect.fail(new NotFoundError({ resource: "User" }))
    : ok({ message });

const updateUser = (data: PostData) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    const id = data.id as string;
    const patch: Record<string, unknown> = { ...data, recentChangeDate: stamp() };
    delete patch.method;
    delete patch.id;

    const result = yield* mongo.updateOne(
      USERS_DB,
      USERS,
      { _id: new ObjectId(id) },
      { $set: patch, $push: { logbook: `${stamp()}: updated user ${id}` } },
    );
    return yield* requireModified(result, "User updated successfully");
  });

const setUserField = (data: PostData) =>
  Effect.gen(function* () {
    const field = data.field ?? "";
    if (SETFIELD_PROTECTED.has(field)) {
      return yield* Effect.fail(
        new ForbiddenError({ message: `Field '${field}' cannot be updated with setfield` }),
      );
    }
    const mongo = yield* Mongo;
    const result = yield* mongo.updateOne(
      USERS_DB,
      USERS,
      { _id: new ObjectId(data.id as string) },
      {
        $set: { [field]: data.value, recentChangeDate: stamp() },
        $push: { logbook: `${stamp()} Set ${field} to ${data.value}` },
      },
    );
    return yield* requireModified(result, "User updated successfully");
  });

const incrementUserField = (data: PostData) =>
  Effect.gen(function* () {
    const field = data.field ?? "";
    const mongo = yield* Mongo;
    const result = yield* mongo.updateOne(
      USERS_DB,
      USERS,
      { _id: new ObjectId(data.id as string) },
      {
        $set: { recentChangeDate: stamp() },
        $inc: { [field]: 1 },
        $push: { logbook: [stamp(), ` ${field}`] },
      },
    );
    return result.modifiedCount === 0
      ? yield* Effect.fail(new NotFoundError({ resource: "User" }))
      : yield* ok({ message: "Counter incremented successfully" });
  });

const changeUserDatabases = (data: PostData) =>
  Effect.gen(function* () {
    yield* validateDatabases(data.databases);
    const mongo = yield* Mongo;
    const databases = data.databases ?? [];
    const result = yield* mongo.updateOne(
      USERS_DB,
      USERS,
      { _id: new ObjectId(data.id as string) },
      {
        $set: {
          databases,
          activeDatabase: databases.length > 0 ? databases[0] : null,
          recentChangeDate: stamp(),
        },
        $push: { logbook: `${stamp()}: Databases changed to [${databases.join(", ")}] by admin` },
      },
    );
    return yield* requireModified(result, "User databases updated successfully");
  });

const createUser = (data: PostData) =>
  Effect.gen(function* () {
    yield* requireCapability("users.manage");
    yield* validateDatabases(data.databases);
    const mongo = yield* Mongo;
    const databases = data.databases ?? [];

    const result = yield* mongo.insertOne(USERS_DB, USERS, {
      name: data.name,
      role: data.role,
      email: data.email,
      databases,
      activeDatabase: databases.length > 0 ? databases[0] : null,
      institution: data.institution,
      isActive: true,
      createdDate: stamp(),
      recentChangeDate: stamp(),
      logbook: [`${stamp()}: User created`],
    });
    if (!result.insertedId) return yield* Effect.fail(new InternalError({ message: "Failed to create user" }));
    return yield* ok({ message: "User created successfully", id: result.insertedId });
  });

export const handleUserPost = (request: Request) =>
  Effect.gen(function* () {
    yield* currentSession;
    const data = yield* decodeBody(PostBody)(request);
    const method = data.method ?? "";

    if (ID_METHODS.has(method) && !isHexId(data.id ?? "")) {
      return yield* Effect.fail(new ValidationError({ message: "Invalid user ID" }));
    }

    if (MANAGE_METHODS.has(method)) {
      yield* requireCapability("users.manage");
    }
    if (method === "setfield" && !(yield* userCan("users.manage"))) {
      const self = yield* currentUser.pipe(Effect.catchAll(() => Effect.succeed(null)));
      if (!self || String(self.doc._id) !== String(data.id)) {
        return yield* Effect.fail(new ForbiddenError({ message: "You can only edit your own profile" }));
      }
    }

    switch (method) {
      case "update":
        return yield* updateUser(data);
      case "setfield":
        return yield* setUserField(data);
      case "incrementfield":
        return yield* incrementUserField(data);
      case "change_databases":
        return yield* changeUserDatabases(data);
      default:
        // no / unknown method: create a user
        return yield* createUser(data);
    }
  });

// --- DELETE -------------------------------------------------------------

const DeleteBody = Schema.Struct({ id: Schema.String });

export const deleteUser = (request: Request) =>
  Effect.gen(function* () {
    yield* currentSession;
    yield* requireCapability("users.manage");
    const { id } = yield* decodeBody(DeleteBody)(request);
    if (!isHexId(id)) return yield* Effect.fail(new ValidationError({ message: "Invalid user ID" }));

    const mongo = yield* Mongo;
    const result = yield* mongo.deleteOne(USERS_DB, USERS, { _id: new ObjectId(id) });
    if (result.deletedCount === 0) return yield* Effect.fail(new NotFoundError({ resource: "User", id }));
    return yield* ok({ message: "User deleted successfully" });
  });

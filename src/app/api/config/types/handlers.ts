import { Effect, Schema } from "effect";
import {
  ok,
  decodeBody,
  currentDatabase,
  currentSession,
  requireCapability,
  Mongo,
  NotFoundError,
  ValidationError,
} from "@/lib/effect";

const CONFIG = "config";

export const listConfig = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const type = new URL(request.url).searchParams.get("type");
    const mongo = yield* Mongo;

    if (type) {
      const doc = yield* mongo.findOne(dbName, CONFIG, { type });
      return yield* ok(doc);
    }
    return yield* ok(yield* mongo.find(dbName, CONFIG));
  });

const PostBody = Schema.Struct(
  {
    method: Schema.Literal("additem", "updateitem", "deleteitem", "seed", "update"),
    type: Schema.String,
    data: Schema.optional(Schema.Unknown),
    item: Schema.optional(Schema.Unknown),
    value: Schema.optional(Schema.String),
    oldValue: Schema.optional(Schema.String),
    version: Schema.optional(Schema.Number),
  },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);
type PostData = Schema.Schema.Type<typeof PostBody>;

const stampFields = (by: string) => ({ lastModified: new Date().toISOString(), modifiedBy: by });

const addItem = (dbName: string, by: string, data: PostData) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    yield* mongo.updateOne(
      dbName,
      CONFIG,
      { type: data.type },
      { $push: { data: data.item }, $set: stampFields(by), $inc: { version: 1 } },
      { upsert: true },
    );
    return yield* ok({ message: "Item added successfully" });
  });

const updateItem = (dbName: string, by: string, data: PostData) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    const result = yield* mongo.updateOne(
      dbName,
      CONFIG,
      { type: data.type, "data.value": data.oldValue },
      { $set: { "data.$": data.item, ...stampFields(by) }, $inc: { version: 1 } },
    );
    if (result.modifiedCount === 0) return yield* Effect.fail(new NotFoundError({ resource: "Config item" }));
    return yield* ok({ message: "Item updated successfully" });
  });

const deleteItem = (dbName: string, by: string, data: PostData) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    yield* mongo.updateOne(
      dbName,
      CONFIG,
      { type: data.type },
      { $pull: { data: { value: data.value } }, $set: stampFields(by), $inc: { version: 1 } },
    );
    return yield* ok({ message: "Item deleted successfully" });
  });

const seed = (dbName: string, by: string, data: PostData) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    const existing = yield* mongo.findOne(dbName, CONFIG, { type: data.type });
    if (existing) return yield* ok({ message: "Configuration already exists" });

    yield* mongo.insertOne(dbName, CONFIG, {
      type: data.type,
      data: data.data,
      version: 1,
      ...stampFields(by),
      isDefault: true,
    });
    return yield* ok({ message: "Configuration seeded successfully" });
  });

const replaceType = (dbName: string, by: string, data: PostData) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    yield* mongo.updateOne(
      dbName,
      CONFIG,
      { type: data.type },
      {
        $set: {
          type: data.type,
          data: data.data,
          version: data.version ? data.version + 1 : 1,
          ...stampFields(by),
          isDefault: false,
        },
      },
      { upsert: true },
    );
    return yield* ok({ message: "Configuration updated successfully" });
  });

export const handleConfigPost = (request: Request) =>
  Effect.gen(function* () {
    const by = (yield* currentSession).name ?? "unknown user";
    const dbName = yield* currentDatabase;
    const data = yield* decodeBody(PostBody)(request);
    yield* requireCapability(data.method === "seed" ? "config.seed" : "config.edit");

    switch (data.method) {
      case "additem":
        return yield* addItem(dbName, by, data);
      case "updateitem":
        return yield* updateItem(dbName, by, data);
      case "deleteitem":
        return yield* deleteItem(dbName, by, data);
      case "seed":
        return yield* seed(dbName, by, data);
      case "update":
        return yield* replaceType(dbName, by, data);
      default:
        return yield* Effect.fail(new ValidationError({ message: "Unknown method" }));
    }
  });

const DeleteBody = Schema.Struct({
  type: Schema.String,
  value: Schema.optional(Schema.String),
});

export const deleteConfig = (request: Request) =>
  Effect.gen(function* () {
    const by = (yield* currentSession).name ?? "unknown user";
    const dbName = yield* currentDatabase;
    yield* requireCapability("config.edit");
    const { type, value } = yield* decodeBody(DeleteBody)(request);
    const mongo = yield* Mongo;

    if (value) {
      yield* mongo.updateOne(
        dbName,
        CONFIG,
        { type },
        { $pull: { data: { value } }, $set: stampFields(by), $inc: { version: 1 } },
      );
    } else {
      yield* mongo.deleteOne(dbName, CONFIG, { type });
    }
    return yield* ok({ message: "Deleted successfully" });
  });

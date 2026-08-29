import { Effect, Schema } from "effect";
import { ObjectId, type Document } from "mongodb";
import {
  runRoute,
  ok,
  decodeBody,
  currentDatabase,
  currentSession,
  Mongo,
  attempt,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/effect";
import { sampleChain } from "@/app/api/utils/sampleChain";

/**
 * @swagger
 * /api/samples:
 *   get:
 *     summary: Retrieve all samples
 *     tags: [Samples]
 *     parameters:
 *       - in: query
 *         name: related
 *         schema: { type: boolean }
 *         description: Attach the parent-sample chain to each sample
 *     responses:
 *       200: { description: List of samples }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 *   post:
 *     summary: Create or modify a sample
 *     description: >
 *       Body without `method`, or `method: create`, creates a sample.
 *       `method: update | setfield | incrementfield` modifies one.
 *       `method: get-schema` returns the inferred sample schema.
 *     tags: [Samples]
 *     responses:
 *       200: { description: Operation successful }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Protected field }
 *       404: { description: Sample or parent not found }
 *       500: { description: Server error }
 *   delete:
 *     summary: Delete a sample
 *     tags: [Samples]
 *     responses:
 *       200: { description: Deleted }
 *       400: { description: Invalid id }
 *       404: { description: Not found }
 */

const SAMPLES = "samples";
const PROTECTED_SETFIELDS = new Set(["_id", "createdDate", "recentChangeDate", "logbook", "filesId"]);

type LogbookEntry = [string, string];
const stamp = () => new Date().toISOString();
const logbook = (message: string): LogbookEntry => [stamp(), message];

/** Resolve a parent reference (id string, ObjectId, or sample name) to its _id. */
const resolveParentId = (dbName: string, input: unknown) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    const asString = String(input);

    const byRawId = yield* mongo.findOne(dbName, SAMPLES, { _id: input as never });
    if (byRawId) return byRawId._id as ObjectId;

    if (ObjectId.isValid(asString)) {
      const byOid = yield* mongo.findOne(dbName, SAMPLES, { _id: new ObjectId(asString) });
      if (byOid) return byOid._id as ObjectId;
    }

    const byName = yield* mongo.findOne(dbName, SAMPLES, { name: asString });
    if (byName) return byName._id as ObjectId;

    return yield* Effect.fail(new NotFoundError({ resource: "Parent sample" }));
  });

/** Confirm the responsible user exists in usersdb. */
const requireResponsible = (responsible: unknown) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    const asString = String(responsible);
    const direct = yield* mongo.findOne("usersdb", "users", { _id: responsible as never });
    if (direct) return;
    if (!ObjectId.isValid(asString)) {
      return yield* Effect.fail(new ValidationError({ message: "Invalid responsible user id" }));
    }
    const byOid = yield* mongo.findOne("usersdb", "users", { _id: new ObjectId(asString) });
    if (!byOid) {
      return yield* Effect.fail(new ValidationError({ message: "Responsible user not found" }));
    }
  });

export const listSamples = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const includeRelated = new URL(request.url).searchParams.get("related") === "true";

    const mongo = yield* Mongo;
    const samples = yield* mongo.find(dbName, SAMPLES);

    if (includeRelated) {
      for (const sample of samples) {
        if (sample.parentId) {
          const chain = yield* sampleChain(dbName, sample._id);
          sample.parentChain = chain.slice(1);
        }
      }
    }
    return yield* ok(samples);
  });

const PostBody = Schema.Struct(
  {
    method: Schema.optional(
      Schema.Literal("create", "update", "setfield", "incrementfield", "get-schema"),
    ),
    id: Schema.optional(Schema.String),
    parentId: Schema.optional(Schema.Unknown),
    field: Schema.optional(Schema.String),
    value: Schema.optional(Schema.Unknown),
    customLogbookEntry: Schema.optional(Schema.String),
    responsible: Schema.optional(Schema.Unknown),
  },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);

const inferSchema = (dbName: string) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    const collection = yield* mongo.collection(dbName, SAMPLES);
    const first = yield* attempt(() => collection.findOne({}), "samples.findOne");
    if (!first) return {} as Record<string, string>;

    const schema: Record<string, string> = {};
    for (const [key, value] of Object.entries(first)) schema[key] = typeof value;

    const fields = yield* attempt(
      () =>
        collection
          .aggregate([
            { $project: { kv: { $objectToArray: "$$ROOT" } } },
            { $unwind: "$kv" },
            { $group: { _id: "$kv.k", types: { $addToSet: { $type: "$kv.v" } } } },
          ])
          .toArray(),
      "samples.aggregate schema",
    );
    for (const field of fields) {
      if (!schema[field._id]) schema[field._id] = field.types[0];
    }
    return schema;
  });

export const handleSamplePost = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const authName = (yield* currentSession).name ?? "unknown user";
    const data = yield* decodeBody(PostBody)(request);
    const mongo = yield* Mongo;

    let existing: Document | null = null;
    if (data.id) {
      existing = yield* mongo.findOne(dbName, SAMPLES, { _id: data.id as never });
      if (!existing && ObjectId.isValid(data.id)) {
        existing = yield* mongo.findOne(dbName, SAMPLES, { _id: new ObjectId(data.id) });
      }
      if (!existing) return yield* Effect.fail(new NotFoundError({ resource: "Sample", id: data.id }));
    }

    const record: Record<string, unknown> = { ...data };
    if (data.parentId != null && data.parentId !== "") {
      record.parentId = yield* resolveParentId(dbName, data.parentId);
    }

    if (data.method === "get-schema") {
      return yield* ok(yield* inferSchema(dbName));
    }

    if (data.method === "update") {
      const update: Record<string, unknown> = {};
      for (const key of [
        "parentId",
        "family",
        "genus",
        "species",
        "responsible",
        "type",
        "date",
        "location",
        "lat",
        "lon",
        "sex",
        "box",
        "slot",
        "notes",
        "subsampletype",
      ]) {
        update[key] = record[key];
      }
      update.recentChangeDate = stamp();

      const result = yield* mongo.updateOne(
        dbName,
        SAMPLES,
        { _id: (existing as Document)._id },
        { $set: update, $push: { logbook: logbook(`updated sample ${data.id} by ${authName}`) } },
      );
      if (result.modifiedCount === 0) {
        return yield* Effect.fail(new NotFoundError({ resource: "Sample", id: data.id }));
      }
      return yield* ok({ message: "Sample updated successfully" });
    }

    if (data.method === "setfield") {
      const field = data.field ?? "";
      if (PROTECTED_SETFIELDS.has(field)) {
        return yield* Effect.fail(
          new ForbiddenError({ message: `Field '${field}' cannot be updated with setfield` }),
        );
      }
      const oldValue = (existing as Document)[field] ?? "undefined";
      const entry = data.customLogbookEntry
        ? logbook(`${data.customLogbookEntry} by ${authName}`)
        : logbook(`Set ${field} from ${oldValue} to ${String(data.value)} by ${authName}`);

      const result = yield* mongo.updateOne(
        dbName,
        SAMPLES,
        { _id: (existing as Document)._id },
        { $set: { [field]: data.value, recentChangeDate: stamp() }, $push: { logbook: entry } },
      );
      if (result.modifiedCount === 0) {
        return yield* Effect.fail(new NotFoundError({ resource: "Sample", id: data.id }));
      }
      return yield* ok({ message: "Sample updated successfully" });
    }

    if (data.method === "incrementfield") {
      const field = data.field ?? "";
      const set: Record<string, unknown> = { recentChangeDate: stamp() };
      if (field === "fed") set.lastFed = stamp();
      const result = yield* mongo.updateOne(
        dbName,
        SAMPLES,
        { _id: (existing as Document)._id },
        {
          $set: set,
          $inc: { [field]: 1 },
          $push: { logbook: logbook(`${field} by ${authName}`) },
        },
      );
      if (result.modifiedCount === 0) {
        return yield* Effect.fail(new NotFoundError({ resource: "Sample", id: data.id }));
      }
      return yield* ok({ message: "Counter incremented successfully" });
    }

    // no method, or method: create
    if (record.responsible != null) {
      yield* requireResponsible(record.responsible);
    }

    const sampleDoc: Record<string, unknown> = {
      ...record,
      recentChangeDate: stamp(),
      logbook: [logbook(`Uploaded sample ${data.name ?? ""} by ${authName}`)],
    };
    delete sampleDoc.method;
    if (sampleDoc._id == null) delete sampleDoc._id;

    const result = yield* mongo.insertOne(dbName, SAMPLES, sampleDoc as never);
    return yield* ok({ success: true, _id: result.insertedId });
  });

const DeleteBody = Schema.Struct({ id: Schema.String });

export const deleteSample = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const { id } = yield* decodeBody(DeleteBody)(request);
    if (!ObjectId.isValid(id)) {
      return yield* Effect.fail(new ValidationError({ message: "Invalid sample id" }));
    }
    const mongo = yield* Mongo;

    let result = yield* mongo.deleteOne(dbName, SAMPLES, { _id: id as never });
    if (result.deletedCount === 0) {
      result = yield* mongo.deleteOne(dbName, SAMPLES, { _id: new ObjectId(id) });
    }
    if (result.deletedCount === 0) {
      return yield* Effect.fail(new NotFoundError({ resource: "Sample", id }));
    }
    return yield* ok({ message: "Sample deleted successfully" });
  });

export const GET = (request: Request) => runRoute(listSamples(request));
export const POST = (request: Request) => runRoute(handleSamplePost(request));
export const DELETE = (request: Request) => runRoute(deleteSample(request));

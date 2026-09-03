import { Effect, Schema } from "effect";
import { ObjectId, type Document } from "mongodb";
import {
  ok,
  decodeBody,
  currentDatabase,
  currentSession,
  Mongo,
  attempt,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  requireCapability,
} from "@/lib/effect";
import { sampleChain } from "@/app/api/utils/sampleChain";
import { DEFAULT_ID_GENERATION, regenerateSampleNames } from "@/shared/config/sample-names";

const SAMPLES = "samples";
const PROTECTED_SETFIELDS = new Set(["_id", "createdDate", "recentChangeDate", "logbook", "filesId"]);

// Keys a sample type's config `fields` list must never be able to write or shadow.
const CORE_SAMPLE_FIELDS = new Set([
  "_id", "name", "type", "parentId", "family", "genus", "species",
  "nomenclature", "responsible", "date", "location", "lat", "lon",
  "sex", "box", "slot", "subsampletype", "notes", "logbook",
  "filesId", "createdDate", "recentChangeDate",
]);

type LogbookEntry = [string, string];
const stamp = () => new Date().toISOString();
const logbook = (message: string): LogbookEntry => [stamp(), message];

/**
 * Pick only the admin-defined fields for `type` from the request's `fields`
 * bag. A type's config `fields` list can name extra keys; only those, and never
 * a core column, are accepted.
 */
const configuredCustomFields = (dbName: string, type: unknown, fields: unknown) =>
  Effect.gen(function* () {
    if (!type || !fields || typeof fields !== "object") return {} as Record<string, unknown>;
    const mongo = yield* Mongo;
    const cfg = yield* mongo.findOne(dbName, "config", { type: "sampletypes" });
    const typeCfg = (cfg?.data as Array<{ value?: string; fields?: unknown }> | undefined)?.find(
      (t) => t.value === type,
    );
    const allowed = Array.isArray(typeCfg?.fields)
      ? typeCfg.fields
          .filter(
            (f): f is { key: string; kind: string } =>
              !!f && typeof f === "object" && "key" in f && "kind" in f,
          )
          .map((f) => f.key)
          .filter((k) => !CORE_SAMPLE_FIELDS.has(k))
      : [];
    const bag = fields as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of allowed) {
      if (bag[key] !== undefined) out[key] = bag[key];
    }
    return out;
  });

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
      Schema.Literal("create", "update", "setfield", "incrementfield", "get-schema", "retaxon"),
    ),
    id: Schema.optional(Schema.String),
    ids: Schema.optional(Schema.Array(Schema.String)),
    changes: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
    regenerateNames: Schema.optional(Schema.Boolean),
    parentId: Schema.optional(Schema.Unknown),
    field: Schema.optional(Schema.String),
    value: Schema.optional(Schema.Unknown),
    customLogbookEntry: Schema.optional(Schema.String),
    responsible: Schema.optional(Schema.Unknown),
    fields: Schema.optional(Schema.Unknown),
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

    // Change family / genus / species on one or many samples at once, and
    // optionally regenerate the derived names in a single race-free pass — a
    // bulk of parallel setfield writes would collide on the sequential number.
    if (data.method === "retaxon") {
      const ids = data.ids ?? [];
      const allowed = ["family", "genus", "species"] as const;
      const taxonChanges: Record<string, unknown> = {};
      for (const key of allowed) {
        if (data.changes && key in data.changes) taxonChanges[key] = data.changes[key];
      }
      if (ids.length === 0 || Object.keys(taxonChanges).length === 0) {
        return yield* Effect.fail(
          new ValidationError({ message: "retaxon needs ids and family/genus/species changes" }),
        );
      }

      const objectIds = ids.map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : id));
      const targetsRaw = yield* mongo.find(dbName, SAMPLES, { _id: { $in: objectIds } as never });
      if (targetsRaw.length === 0) {
        return yield* Effect.fail(new NotFoundError({ resource: "Sample" }));
      }

      const targets = targetsRaw.map((s) => ({
        _id: s._id,
        type: s.type,
        name: s.name,
        family: taxonChanges.family ?? s.family,
        genus: taxonChanges.genus ?? s.genus,
        species: taxonChanges.species ?? s.species,
      }));

      let newNames = new Map<string, string>();
      if (data.regenerateNames) {
        const settings = yield* mongo.findOne(dbName, "settings", { type: "main" });
        const idGeneration = settings?.idGeneration ?? DEFAULT_ID_GENERATION;
        const allSamples = yield* mongo.find(dbName, SAMPLES);
        // The collision context must already reflect the new taxonomy.
        const byId = new Map(targets.map((t) => [String(t._id), t]));
        const context = allSamples.map((s) => byId.get(String(s._id)) ?? s);
        newNames = regenerateSampleNames(targets as never, context as never, idGeneration);
      }

      const now = stamp();
      const renamed: Array<{ id: string; from: string; to: string }> = [];
      const ops = targets.map((t) => {
        const set: Record<string, unknown> = { ...taxonChanges, recentChangeDate: now };
        const parts = allowed.filter((k) => k in taxonChanges).map((k) => `${k}=${taxonChanges[k]}`);
        let message = `Set ${parts.join(", ")} by ${authName}`;
        const newName = newNames.get(String(t._id));
        if (newName && newName !== t.name) {
          set.name = newName;
          renamed.push({ id: String(t._id), from: t.name, to: newName });
          message += `; name ${t.name} -> ${newName}`;
        }
        return {
          updateOne: {
            filter: { _id: t._id },
            update: { $set: set, $push: { logbook: logbook(message) } },
          },
        };
      });

      const collection = yield* mongo.collection(dbName, SAMPLES);
      yield* attempt(() => collection.bulkWrite(ops as never), "samples.bulkWrite retaxon");
      return yield* ok({ updated: ops.length, renamed });
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
      Object.assign(update, yield* configuredCustomFields(dbName, data.type, data.fields));

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
      ...(yield* configuredCustomFields(dbName, data.type, data.fields)),
    };
    delete sampleDoc.method;
    delete sampleDoc.fields;
    if (sampleDoc._id == null) delete sampleDoc._id;

    const result = yield* mongo.insertOne(dbName, SAMPLES, sampleDoc as never);
    return yield* ok({ success: true, _id: result.insertedId });
  });

const DeleteBody = Schema.Struct({ id: Schema.String });

export const deleteSample = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    yield* requireCapability("samples.delete");
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

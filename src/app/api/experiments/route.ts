import { Effect, Schema } from "effect";
import { ObjectId, type Document } from "mongodb";
import fs from "fs/promises";
import {
  runRoute,
  ok,
  decodeBody,
  currentDatabase,
  Mongo,
  attempt,
  ValidationError,
  NotFoundError,
} from "@/lib/effect";
import { sampleChain } from "@/app/api/utils/sampleChain";

/**
 * @swagger
 * /api/experiments:
 *   get:
 *     summary: Retrieve experiments
 *     tags: [Experiments]
 *     parameters:
 *       - { in: query, name: type, schema: { type: string } }
 *       - { in: query, name: includeRawData, schema: { type: boolean } }
 *       - { in: query, name: includeOriginalData, schema: { type: boolean } }
 *       - { in: query, name: includeTraitsData, schema: { type: boolean } }
 *       - { in: query, name: related, schema: { type: boolean } }
 *     responses:
 *       200: { description: Experiments }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Create or modify an experiment
 *     description: "`method: create` inserts an experiment (and any embedded traits) and stamps the sample. `method: setfield` updates one field."
 *     tags: [Experiments]
 *     responses:
 *       200: { description: OK }
 *       400: { description: Invalid request or unknown method }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 *   delete:
 *     summary: Delete an experiment (and its file)
 *     tags: [Experiments]
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */

const EXPERIMENTS = "experiments";
const SAMPLES = "samples";
const TRAITS = "traits";
const FILES = "files";

const stamp = () => new Date().toISOString();
const logbook = (...parts: string[]): string[] => [stamp(), ...parts];

export const listExperiments = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const params = new URL(request.url).searchParams;
    const includeRawData = params.get("includeRawData") === "true";
    const includeOriginalData = params.get("includeOriginalData") === "true";
    const includeTraitsData = params.get("includeTraitsData") === "true";
    const includeRelated = params.get("related") === "true";
    const type = params.get("type");

    const projection = includeRawData
      ? {}
      : includeTraitsData
        ? { rawdata: 0, originalData: 0, metadata: 0, "data.channelData": 0, "data.summary": 0 }
        : { rawdata: 0, data: 0, originalData: 0, metadata: 0 };

    const mongo = yield* Mongo;
    const collection = yield* mongo.collection(dbName, EXPERIMENTS);
    const experiments = yield* attempt(
      () => collection.find(type ? { type } : {}, { projection }).toArray(),
      "experiments.find",
    );

    if (includeRawData && includeOriginalData) {
      for (const exp of experiments) {
        exp.isOriginalData = true;
        if (exp.originalData) exp.rawdata = exp.originalData;
      }
    } else if (includeRawData) {
      for (const exp of experiments) {
        exp.isOriginalData = false;
        if (exp.data) exp.rawdata = exp.data;
      }
    }

    if (includeRelated) {
      for (const exp of experiments) {
        if (!exp.sampleId) continue;
        const chain = yield* sampleChain(dbName, exp.sampleId);
        exp.sampleChain = chain;
        if (chain.length > 0) exp.sample = chain[0];
        exp.traits = yield* mongo.find(dbName, TRAITS, { sampleId: exp.sampleId });
      }
    }

    return yield* ok(experiments);
  });

const PostBody = Schema.Struct(
  {
    method: Schema.optional(Schema.Literal("create", "setfield")),
    id: Schema.optional(Schema.String),
    sampleId: Schema.optional(Schema.String),
    responsible: Schema.optional(Schema.Unknown),
    field: Schema.optional(Schema.String),
    value: Schema.optional(Schema.Unknown),
    name: Schema.optional(Schema.String),
    type: Schema.optional(Schema.String),
    data: Schema.optional(Schema.Unknown),
    traits: Schema.optional(Schema.Array(Schema.Record({ key: Schema.String, value: Schema.Unknown }))),
  },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);
type PostData = Schema.Schema.Type<typeof PostBody>;

const createExperiment = (dbName: string, data: PostData) =>
  Effect.gen(function* () {
    if (!data.sampleId) {
      return yield* Effect.fail(new ValidationError({ message: "Sample id is required" }));
    }
    const mongo = yield* Mongo;

    const user = ObjectId.isValid(String(data.responsible))
      ? yield* mongo.findOne("usersdb", "users", { _id: new ObjectId(String(data.responsible)) })
      : null;
    if (!user) return yield* Effect.fail(new ValidationError({ message: "Responsible user not found" }));

    const structured =
      data.data && typeof data.data === "object" && data.name != null && data.type != null;

    let experimentData: Record<string, unknown>;
    let embeddedTraits: Document[] = [];

    if (structured) {
      experimentData = {
        ...data,
        version: data.version ?? 1,
        recentChangeDate: stamp(),
        logbook: data.logbook ?? [logbook(`Created experiment ${data.name}`)],
      };
      delete experimentData.method;
      if (Array.isArray(data.traits)) {
        embeddedTraits = data.traits.map((t) => ({ ...t, experimentId: null, createdAt: stamp() }));
        delete experimentData.traits;
      }
    } else {
      experimentData = {
        name: data.name,
        sampleId: data.sampleId,
        responsible: data.responsible,
        type: data.type,
        date: data.date,
        notes: data.notes,
        filename: data.filename,
        filepath: data.filepath,
        fileId: data.fileId,
        version: 1,
        conversionHistory: [],
        recentChangeDate: stamp(),
        logbook: [logbook(`Uploaded experiment ${data.name}`)],
        window: data.window,
        data: data.dataFields,
        originalData: data.dataFields,
        metadata: data.metadata,
      };
    }

    const inserted = yield* mongo.insertOne(dbName, EXPERIMENTS, experimentData as never);
    const experimentId = inserted.insertedId;

    yield* mongo.updateOne(
      dbName,
      SAMPLES,
      { _id: new ObjectId(data.sampleId) },
      {
        $set: { recentTraitChangeDate: stamp() },
        $push: { logbook: logbook(`New experiment ${data.name} created for sample ${data.sampleId}`) },
      },
    );

    if (embeddedTraits.length > 0) {
      const toInsert = embeddedTraits.map((t) => ({
        ...t,
        experimentId: experimentId.toString(),
        sampleId: data.sampleId,
        responsible: data.responsible,
      }));
      const traits = yield* mongo.collection(dbName, TRAITS);
      const result = yield* attempt(() => traits.insertMany(toInsert), "traits.insertMany").pipe(
        Effect.catchAll((err) =>
          mongo
            .updateOne(
              dbName,
              EXPERIMENTS,
              { _id: experimentId },
              { $push: { logbook: logbook(`Warning: failed to create ${embeddedTraits.length} embedded traits - ${err.message}`) } },
            )
            .pipe(Effect.as({ insertedCount: 0 })),
        ),
      );
      if (result.insertedCount > 0) {
        yield* mongo.updateOne(
          dbName,
          EXPERIMENTS,
          { _id: experimentId },
          { $push: { logbook: logbook(`Automatically created ${result.insertedCount} traits from parsed data`) } },
        );
      }
    }

    return yield* ok({
      success: true,
      id: experimentId,
      experimentId,
      traitsCreated: embeddedTraits.length,
    });
  });

const setExperimentField = (dbName: string, data: PostData) =>
  Effect.gen(function* () {
    if (!data.id || !ObjectId.isValid(data.id)) {
      return yield* Effect.fail(new ValidationError({ message: "Invalid experiment id" }));
    }
    const mongo = yield* Mongo;
    const experiment = yield* mongo.findOne(dbName, EXPERIMENTS, { _id: new ObjectId(data.id) });
    if (!experiment) return yield* Effect.fail(new NotFoundError({ resource: "Experiment", id: data.id }));

    const field = data.field ?? "";
    const oldValue = experiment[field];
    const result = yield* mongo.updateOne(
      dbName,
      EXPERIMENTS,
      { _id: experiment._id },
      {
        $set: { [field]: data.value, recentChangeDate: stamp() },
        $push: { logbook: logbook(`Set ${field} from ${String(oldValue)} to ${String(data.value)}`) },
      },
    );
    if (result.modifiedCount === 0) {
      return yield* Effect.fail(new NotFoundError({ resource: "Experiment", id: data.id }));
    }
    return yield* ok({ message: "Experiment updated successfully" });
  });

export const handleExperimentPost = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const data = yield* decodeBody(PostBody)(request);
    switch (data.method) {
      case "create":
        return yield* createExperiment(dbName, data);
      case "setfield":
        return yield* setExperimentField(dbName, data);
      default:
        return yield* Effect.fail(new ValidationError({ message: "Method not found" }));
    }
  });

const DeleteBody = Schema.Struct({ id: Schema.String });

export const deleteExperiment = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const { id } = yield* decodeBody(DeleteBody)(request);
    if (!ObjectId.isValid(id)) {
      return yield* Effect.fail(new ValidationError({ message: "Invalid experiment id" }));
    }
    const mongo = yield* Mongo;

    const experiment = yield* mongo.findOne(dbName, EXPERIMENTS, { _id: new ObjectId(id) });
    if (!experiment) return yield* Effect.fail(new NotFoundError({ resource: "Experiment", id }));

    let fileDeleted = false;
    let fileDocDeleted = false;

    if (experiment.fileId) {
      const fileDoc = yield* mongo.findOne(dbName, FILES, { _id: new ObjectId(String(experiment.fileId)) });
      if (fileDoc) {
        const unlinked = yield* attempt(() => fs.unlink(fileDoc.path), "fs.unlink experiment file").pipe(
          Effect.as(true),
          Effect.catchAll(() => Effect.succeed(false)),
        );
        if (unlinked) {
          yield* mongo.deleteOne(dbName, FILES, { _id: fileDoc._id });
          fileDeleted = true;
          fileDocDeleted = true;
        }
      }
    }

    const result = yield* mongo.deleteOne(dbName, EXPERIMENTS, { _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return yield* Effect.fail(new NotFoundError({ resource: "Experiment", id }));
    }

    return yield* ok({ message: "Experiment deleted successfully", fileDeleted, fileDocDeleted });
  });

export const GET = (request: Request) => runRoute(listExperiments(request));
export const POST = (request: Request) => runRoute(handleExperimentPost(request));
export const DELETE = (request: Request) => runRoute(deleteExperiment(request));

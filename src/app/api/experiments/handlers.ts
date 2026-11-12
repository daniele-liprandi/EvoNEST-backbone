import { Effect, Schema } from "effect";
import { ObjectId, type Document } from "mongodb";
import fs from "fs/promises";
import {
  ok,
  decodeBody,
  currentDatabase,
  requireCapability,
  Mongo,
  attempt,
  ValidationError,
  NotFoundError,
  InternalError,
} from "@/lib/effect";
import { sampleChain } from "@/app/api/utils/sampleChain";
import { deleteBlobIfUnreferenced } from "@/app/api/files/gridfs";
import { requireNumericValue } from "@/app/api/traits/handlers";

const EXPERIMENTS = "experiments";
const SAMPLES = "samples";
const TRAITS = "traits";
const FILES = "files";
const CONFIG = "config";
const ATTACHMENTS = "attachments";

const stamp = () => new Date().toISOString();
const isHexId = (v: unknown): v is string =>
  typeof v === "string" && ObjectId.isValid(v) && new ObjectId(v).toHexString() === v;

// --- GET ---------------------------------------------------------------------

const projectionFor = (includeRawData: boolean, includeTraitsData: boolean): Document => {
  if (includeRawData) return {};
  if (includeTraitsData) {
    return { rawdata: 0, originalData: 0, metadata: 0, "data.channelData": 0, "data.summary": 0 };
  }
  return { rawdata: 0, data: 0, originalData: 0, metadata: 0 };
};

export const listExperiments = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const params = new URL(request.url).searchParams;
    const includeRawData = params.get("includeRawData") === "true";
    const includeOriginalData = params.get("includeOriginalData") === "true";
    const includeRelated = params.get("related") === "true";
    const includeTraitsData = params.get("includeTraitsData") === "true";
    const filter: Document = {};
    const technique = params.get("technique");
    if (technique) filter.technique = technique;
    const kind = params.get("kind");
    if (kind) filter.kind = kind;
    // `parentId=null` selects top-level rows; an id selects one protocol experiment's children.
    const parentId = params.get("parentId");
    if (parentId !== null) filter.parentId = parentId === "null" ? null : parentId;

    const mongo = yield* Mongo;
    const collection = yield* mongo.collection(dbName, EXPERIMENTS);
    const experiments = yield* attempt(
      () => collection.find(filter, { projection: projectionFor(includeRawData, includeTraitsData) }).toArray(),
      "experiments.find",
    );

    if (includeRawData) {
      for (const experiment of experiments) {
        if (includeOriginalData) {
          experiment.isOriginalData = true;
          if (experiment.originalData) experiment.rawdata = experiment.originalData;
        } else {
          experiment.isOriginalData = false;
          if (experiment.data) experiment.rawdata = experiment.data;
        }
      }
    }

    if (includeRelated) {
      for (const experiment of experiments) {
        if (!experiment.sampleId) continue;
        const chain = yield* sampleChain(dbName, experiment.sampleId);
        experiment.sampleChain = chain;
        if (chain.length > 0) experiment.sample = chain[0];
        experiment.traits = yield* mongo.find(dbName, TRAITS, { sampleId: experiment.sampleId });
      }
    }

    return yield* ok(experiments);
  });

// --- POST ------------------------------------------------------------------

// Parser quantity -> lab quantity, from `traitquantities[].aliases`
const quantityAliases = (dbName: string) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    const config = yield* mongo.findOne(dbName, CONFIG, { type: "traitquantities" });
    const aliases = new Map<string, string>();
    for (const entry of (config?.data ?? []) as { value?: string; aliases?: unknown }[]) {
      if (!entry.value || !Array.isArray(entry.aliases)) continue;
      for (const alias of entry.aliases) if (typeof alias === "string") aliases.set(alias, entry.value);
    }
    return aliases;
  });

const PostBody = Schema.Struct(
  {
    method: Schema.optional(Schema.String),
    id: Schema.optional(Schema.String),
    sampleId: Schema.optional(Schema.String),
    responsible: Schema.optional(Schema.Unknown),
    name: Schema.optional(Schema.String),
    technique: Schema.optional(Schema.String),
    field: Schema.optional(Schema.String),
    value: Schema.optional(Schema.Unknown),
    data: Schema.optional(Schema.Unknown),
    traits: Schema.optional(Schema.Unknown),
    version: Schema.optional(Schema.Number),
    logbook: Schema.optional(Schema.Unknown),
  },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);
type PostData = Schema.Schema.Type<typeof PostBody>;

/** Confirm the responsible user exists in usersdb. */
const requireResponsible = (responsible: unknown) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    if (!isHexId(String(responsible))) {
      return yield* Effect.fail(new ValidationError({ message: "Responsible not found" }));
    }
    const user = yield* mongo.findOne("usersdb", "users", { _id: new ObjectId(String(responsible)) });
    if (!user) return yield* Effect.fail(new ValidationError({ message: "Responsible not found" }));
  });

const createExperiment = (dbName: string, data: PostData) =>
  Effect.gen(function* () {
    if (!data.sampleId) {
      return yield* Effect.fail(
        new ValidationError({ message: "Sample ID is empty or wrong. Please put the correct Sample ID." }),
      );
    }
    yield* requireResponsible(data.responsible);

    const mongo = yield* Mongo;
    const now = stamp();
    const { technique } = data;

    // Structured payload from the parsers already carries the shape; the legacy
    // path assembles a minimal document from top-level fields.
    const structured = !!data.data && typeof data.data === "object" && !!data.name && !!technique;

    let embeddedTraits: Record<string, unknown>[] = [];
    let experimentData: Record<string, unknown>;

    if (structured) {
      experimentData = {
        ...data,
        kind: "measurement",
        parentId: null,
        version: data.version || 1,
        recentChangeDate: now,
        logbook: data.logbook || [[now, `Created experiment ${data.name}`]],
      };
      if (Array.isArray(data.traits)) {
        for (const trait of data.traits as Record<string, unknown>[]) yield* requireNumericValue(trait.value);
        const aliases = yield* quantityAliases(dbName);
        embeddedTraits = (data.traits as Record<string, unknown>[]).map((trait) => {
          const { method: _method, ...rest } = trait;
          const quantity = rest.quantity as string | undefined;
          return {
            ...rest,
            ...(quantity !== undefined ? { quantity: aliases.get(quantity) ?? quantity } : {}),
            experimentId: null,
            createdAt: now,
          };
        });
      }
      delete experimentData.traits;
      delete experimentData.method;
    } else {
      experimentData = {
        name: data.name,
        sampleId: data.sampleId,
        responsible: data.responsible,
        technique,
        kind: "measurement",
        parentId: null,
        date: data.date,
        notes: data.notes,
        filename: data.filename,
        filepath: data.filepath,
        fileId: data.fileId,
        version: 1,
        conversionHistory: [],
        recentChangeDate: now,
        logbook: [[now, `Uploaded experiment ${data.name}`]],
        window: data.window,
        data: data.dataFields,
        originalData: data.dataFields,
        metadata: data.metadata,
      };
    }

    const inserted = yield* mongo.insertOne(dbName, EXPERIMENTS, experimentData as never);
    if (!inserted.insertedId) {
      return yield* Effect.fail(new InternalError({ message: "Failed to create experiment" }));
    }
    const experimentId = inserted.insertedId;

    // The sample logbook is best-effort: a sample it can't find must not fail
    // the experiment creation.
    yield* mongo.updateOne(
      dbName,
      SAMPLES,
      { _id: new ObjectId(data.sampleId) },
      {
        $set: { recentTraitChangeDate: now },
        $push: { logbook: [now, `New experiment ${data.name} created for sample ${data.sampleId}`] },
      },
    ).pipe(Effect.catchAll(() => Effect.void));

    if (embeddedTraits.length > 0) {
      const traitsToInsert = embeddedTraits.map((trait) => ({
        ...trait,
        experimentId: experimentId.toString(),
        sampleId: data.sampleId,
        responsible: data.responsible,
      }));
      const traitsCollection = yield* mongo.collection(dbName, TRAITS);
      const insertResult = yield* Effect.either(
        attempt(() => traitsCollection.insertMany(traitsToInsert), "traits.insertMany"),
      );

      const note =
        insertResult._tag === "Right"
          ? [stamp(), `Automatically created ${insertResult.right.insertedCount} traits from parsed data`]
          : [stamp(), `Warning: Failed to create ${embeddedTraits.length} embedded traits`];
      yield* mongo
        .updateOne(dbName, EXPERIMENTS, { _id: experimentId }, { $push: { logbook: note } })
        .pipe(Effect.catchAll(() => Effect.void));
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
    if (!isHexId(data.id ?? "")) {
      return yield* Effect.fail(new ValidationError({ message: "Invalid experiment id" }));
    }
    const field = data.field ?? "";
    const mongo = yield* Mongo;
    const _id = new ObjectId(data.id as string);

    const experiment = yield* mongo.findOne(dbName, EXPERIMENTS, { _id });
    if (!experiment) return yield* Effect.fail(new NotFoundError({ resource: "Experiment", id: data.id }));

    const oldValue = experiment[field];
    const result = yield* mongo.updateOne(
      dbName,
      EXPERIMENTS,
      { _id },
      {
        $set: { [field]: data.value, recentChangeDate: stamp() },
        $push: { logbook: [stamp(), `Set ${field} from ${oldValue} to ${data.value}`] },
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

// --- DELETE ----------------------------------------------------------------

const DeleteBody = Schema.Struct({ id: Schema.String });

export const deleteExperiment = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    yield* requireCapability("experiments.delete");
    const { id } = yield* decodeBody(DeleteBody)(request);
    if (!isHexId(id)) return yield* Effect.fail(new ValidationError({ message: "Invalid experiment id" }));

    const mongo = yield* Mongo;
    const _id = new ObjectId(id);
    const experiment = yield* mongo.findOne(dbName, EXPERIMENTS, { _id });
    if (!experiment) return yield* Effect.fail(new NotFoundError({ resource: "Experiment", id }));

    const result = yield* mongo.deleteOne(dbName, EXPERIMENTS, { _id });
    if (result.deletedCount === 0) {
      return yield* Effect.fail(new InternalError({ message: "Failed to delete experiment" }));
    }

    const fileIds = [
      ...new Set([experiment.fileId, ...(Array.isArray(experiment.filesId) ? experiment.filesId : [])].filter(isHexId)),
    ];
    const filesDeleted: string[] = [];
    const filesKept: string[] = [];
    for (const fileId of fileIds) {
      const oid = new ObjectId(fileId);
      const fileDoc = yield* mongo.findOne(dbName, FILES, { _id: oid });
      if (!fileDoc) continue;
      const fileName = fileDoc.name ?? fileId;
      const [byExperiment, byAttachment] = yield* Effect.all([
        mongo.findOne(dbName, EXPERIMENTS, { $or: [{ fileId }, { filesId: fileId }] }),
        mongo.findOne(dbName, ATTACHMENTS, { fileId: oid }),
      ]);
      if (byExperiment) {
        filesKept.push(`File ${fileName} was not deleted as it is used by experiment ${byExperiment.name ?? byExperiment._id}`);
        continue;
      }
      if (byAttachment) {
        filesKept.push(`File ${fileName} was not deleted as it is used by attachment ${byAttachment._id}`);
        continue;
      }
      const removed = yield* mongo.deleteOne(dbName, FILES, { _id: oid });
      if (removed.deletedCount === 0) continue;
      filesDeleted.push(fileName);
      if (fileDoc.storage?.backend === "gridfs") {
        const db = yield* mongo.db(dbName);
        yield* Effect.promise(() => deleteBlobIfUnreferenced(db, fileDoc.storage.ref as ObjectId));
      } else if (typeof fileDoc.path === "string") {
        yield* attempt(() => fs.unlink(fileDoc.path), "fs.unlink").pipe(Effect.catchAll(() => Effect.void));
      }
    }

    return yield* ok({ message: "Experiment deleted successfully", filesDeleted, filesKept });
  });

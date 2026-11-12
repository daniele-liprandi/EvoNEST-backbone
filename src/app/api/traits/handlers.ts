import { Effect, Schema } from "effect";
import { ObjectId, type Document } from "mongodb";
import {
  ok,
  decodeBody,
  currentDatabase,
  currentSession,
  Mongo,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  requireCapability,
} from "@/lib/effect";
import { sampleChain } from "@/app/api/utils/sampleChain";

const TRAITS = "traits";
const SAMPLES = "samples";
const EXPERIMENTS = "experiments";
const RAWDATA = "rawdata";
const PROTECTED_SETFIELDS = new Set([
  "_id",
  "sampleId",
  "responsible",
  "createdDate",
  "recentChangeDate",
  "logbook",
  "filesId",
]);

const stamp = () => new Date().toISOString();
const logbook = (...parts: string[]): string[] => [stamp(), ...parts];
const isHexId = (v: unknown): v is string =>
  typeof v === "string" && ObjectId.isValid(v) && new ObjectId(v).toHexString() === v;

function parseNFibres(nfibres: unknown):
  | { error: string }
  | { type: "single"; value: number }
  | { type: "range"; min: number; max: number; avg: number } {
  if (!nfibres || typeof nfibres !== "string") return { error: "Missing nfibres value" };
  if (nfibres.toLowerCase() === "bundle") return { type: "single", value: 1 };
  if (nfibres.includes("-")) {
    const [min, max] = nfibres.split("-").map((n) => parseInt(n.trim(), 10));
    if (Number.isNaN(min) || Number.isNaN(max)) return { error: "Invalid range format" };
    return { type: "range", min, max, avg: (min + max) / 2 };
  }
  const value = parseInt(nfibres, 10);
  if (Number.isNaN(value)) return { error: "Invalid number format" };
  return { type: "single", value };
}

const area = (diameter: number, count: number) => ((Math.PI * diameter * diameter) / 4) * count;

/** Append derived cross_section traits and a crossSection field for diameter traits. */
function withCrossSections(traits: Document[]): Document[] {
  const derived: Document[] = [];
  for (const trait of traits) {
    if (trait.quantity !== "diameter" || !trait.value) continue;
    const fibres = parseNFibres(trait.nfibres);
    if ("error" in fibres) {
      trait.crossSection = { error: fibres.error, unit: `${trait.unit}²` };
    } else if (fibres.type === "single") {
      trait.crossSection = { area: { single: area(trait.value, fibres.value) }, unit: `${trait.unit}²` };
    } else {
      trait.crossSection = {
        area: {
          min: area(trait.value, fibres.min),
          avg: area(trait.value, fibres.avg),
          max: area(trait.value, fibres.max),
        },
        unit: `${trait.unit}²`,
      };
    }

    const cs: Document = JSON.parse(JSON.stringify(trait));
    cs._id = new ObjectId();
    cs.quantity = "cross_section";
    cs.value = Math.PI * Math.pow(trait.value / 2, 2);
    cs.listvals = "";
    if (trait.std) cs.std = ((Math.PI * trait.value) / 2) * trait.std;
    cs.unit = `${trait.unit}²`;
    derived.push(cs);
  }
  return traits.concat(derived);
}

export const listTraits = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const params = new URL(request.url).searchParams;
    const mongo = yield* Mongo;

    const singleId = params.get("id");
    if (singleId) {
      if (!isHexId(singleId)) return yield* Effect.fail(new NotFoundError({ resource: "Trait", id: singleId }));
      const trait = yield* mongo.findOne(dbName, TRAITS, { _id: new ObjectId(singleId) });
      if (!trait) return yield* Effect.fail(new NotFoundError({ resource: "Trait", id: singleId }));
      return yield* ok(trait);
    }

    const quantity = params.get("quantity");
    const includeSampleFeatures = params.get("includeSampleFeatures") === "true";
    const includeRelated = params.get("related") === "true";

    const traits = yield* mongo.find(dbName, TRAITS, quantity ? { quantity } : {});

    if (includeSampleFeatures) {
      const samples = yield* mongo.find(dbName, SAMPLES);
      const byId = new Map(samples.map((s) => [String(s._id), s]));
      for (const trait of traits) {
        const s = trait.sampleId ? byId.get(String(trait.sampleId)) : undefined;
        trait.sampleName = s?.name ?? "";
        trait.sampletype = s?.type ?? "";
        trait.samplesubtype = s?.subsampletype ?? "";
        trait.family = s?.family ?? "";
        trait.genus = s?.genus ?? "";
        trait.species = s?.species ?? "";
      }
    }

    if (includeRelated) {
      for (const trait of traits) {
        if (!trait.sampleId) continue;
        const chain = yield* sampleChain(dbName, trait.sampleId);
        trait.sampleChain = chain;
        if (chain.length > 0) trait.sample = chain[0];
      }
    }

    return yield* ok(withCrossSections(traits));
  });

const PostBody = Schema.Struct(
  {
    method: Schema.optional(
      Schema.Literal("create", "update", "setfield", "incrementfield", "conversion", "reset"),
    ),
    id: Schema.optional(Schema.String),
    sampleId: Schema.optional(Schema.String),
    responsible: Schema.optional(Schema.Unknown),
    field: Schema.optional(Schema.String),
    quantity: Schema.optional(Schema.Unknown),
    value: Schema.optional(Schema.Unknown),
    traits: Schema.optional(Schema.Array(Schema.Struct({ id: Schema.String, value: Schema.Unknown }, Schema.Record({ key: Schema.String, value: Schema.Unknown })))),
    conversion: Schema.optional(Schema.Unknown),
  },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);
type PostData = Schema.Schema.Type<typeof PostBody>;

const stampSample = (dbName: string, sampleId: ObjectId, entry: string[]) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    return yield* mongo.updateOne(
      dbName,
      SAMPLES,
      { _id: sampleId },
      { $set: { recentTraitChangeDate: stamp() }, $push: { logbook: entry } },
    );
  });

const createTrait = (dbName: string, authName: string, data: PostData) =>
  Effect.gen(function* () {
    if (!isHexId(data.sampleId ?? "")) {
      return yield* Effect.fail(new ValidationError({ message: "Invalid sample id" }));
    }
    const mongo = yield* Mongo;
    const sampleOid = new ObjectId(data.sampleId as string);

    const sample = yield* mongo.findOne(dbName, SAMPLES, { _id: sampleOid });
    if (!sample) return yield* Effect.fail(new NotFoundError({ resource: "Sample", id: data.sampleId }));

    if (data.responsible != null) {
      const user = ObjectId.isValid(String(data.responsible))
        ? yield* mongo.findOne("usersdb", "users", { _id: new ObjectId(String(data.responsible)) })
        : yield* mongo.findOne("usersdb", "users", { _id: data.responsible as never });
      if (!user) return yield* Effect.fail(new ValidationError({ message: "Responsible user not found" }));
    }

    const doc: Record<string, unknown> = { ...data, recentChangeDate: stamp() };
    delete doc.method;
    doc.logbook = [logbook(`Uploaded trait for ${data.sampleId} by ${authName}`)];

    const result = yield* mongo.insertOne(dbName, TRAITS, doc as never);
    yield* stampSample(
      dbName,
      sampleOid,
      logbook(`New trait of quantity ${String(data.quantity)} and value ${String(data.value)} for ${data.sampleId} by ${authName}`),
    );
    return yield* ok({ success: true, id: result.insertedId });
  });

const updateTrait = (dbName: string, data: PostData) =>
  Effect.gen(function* () {
    if (!isHexId(data.id ?? "")) return yield* Effect.fail(new ValidationError({ message: "Invalid trait id" }));
    if (!isHexId(data.sampleId ?? "")) return yield* Effect.fail(new ValidationError({ message: "Invalid sample id" }));
    const mongo = yield* Mongo;

    const update: Record<string, unknown> = { ...data, recentChangeDate: stamp() };
    delete update.method;
    delete update.id;

    const result = yield* mongo.updateOne(
      dbName,
      TRAITS,
      { _id: new ObjectId(data.id as string) },
      { $set: update, $push: { logbook: logbook(`Updated trait ${data.id}`) } },
    );
    yield* mongo.updateOne(
      dbName,
      SAMPLES,
      { _id: new ObjectId(data.sampleId as string) },
      { $set: { recentTraitChangeDate: stamp() }, $push: { logbook: logbook(`Updated trait ${data.id}`) } },
    );
    if (result.modifiedCount === 0) return yield* Effect.fail(new NotFoundError({ resource: "Trait", id: data.id }));
    return yield* ok({ message: "Trait updated successfully" });
  });

const setTraitField = (dbName: string, authName: string, data: PostData) =>
  Effect.gen(function* () {
    if (!isHexId(data.id ?? "")) return yield* Effect.fail(new ValidationError({ message: "Invalid trait id" }));
    const field = data.field ?? "";
    if (PROTECTED_SETFIELDS.has(field)) {
      return yield* Effect.fail(new ForbiddenError({ message: `Field '${field}' cannot be updated with setfield` }));
    }
    const mongo = yield* Mongo;
    const result = yield* mongo.updateOne(
      dbName,
      TRAITS,
      { _id: new ObjectId(data.id as string) },
      {
        $set: { [field]: data.value, recentChangeDate: stamp() },
        $push: { logbook: logbook(`Set ${field} to ${String(data.value)} by ${authName}`) },
      },
    );
    if (result.modifiedCount === 0) return yield* Effect.fail(new NotFoundError({ resource: "Trait", id: data.id }));
    return yield* ok({ message: "Trait updated successfully" });
  });

const incrementTraitField = (dbName: string, authName: string, data: PostData) =>
  Effect.gen(function* () {
    if (!isHexId(data.id ?? "")) return yield* Effect.fail(new ValidationError({ message: "Invalid trait id" }));
    const field = data.field ?? "";
    const mongo = yield* Mongo;
    const result = yield* mongo.updateOne(
      dbName,
      TRAITS,
      { _id: new ObjectId(data.id as string) },
      {
        $set: { recentChangeDate: stamp() },
        $inc: { [field]: 1 },
        $push: { logbook: logbook(`${field} by ${authName}`) },
      },
    );
    if (result.modifiedCount === 0) return yield* Effect.fail(new NotFoundError({ resource: "Trait", id: data.id }));
    return yield* ok({ message: "Counter incremented successfully" });
  });

const firstTraitSample = (dbName: string, data: PostData) =>
  Effect.gen(function* () {
    const list = data.traits ?? [];
    if (list.length === 0) return yield* Effect.fail(new ValidationError({ message: "No traits provided" }));
    const mongo = yield* Mongo;
    const first = yield* mongo.findOne(dbName, TRAITS, { _id: new ObjectId(list[0].id) });
    if (!first) return yield* Effect.fail(new NotFoundError({ resource: "Trait", id: list[0].id }));
    return first;
  });

const applyConversion = (dbName: string, data: PostData) =>
  Effect.gen(function* () {
    const first = yield* firstTraitSample(dbName, data);
    const conv = data.conversion as {
      ratio: number;
      oldDiameters: number[];
      newDiameters: number[];
      oldCrossSection: number;
      newCrossSection: number;
    };
    const mongo = yield* Mongo;

    const experiments = yield* mongo.find(dbName, EXPERIMENTS, { sampleId: first.sampleId });
    for (const exp of experiments) {
      const raw = yield* mongo.findOne(dbName, RAWDATA, { experimentId: exp._id });
      if (!raw) continue;
      const originalData = raw.originalData ?? raw.data;
      const updatedData = {
        ...raw.data,
        EngineeringStress: raw.data.EngineeringStress.map((v: number) => v * conv.ratio),
      };
      yield* mongo.updateOne(
        dbName,
        RAWDATA,
        { experimentId: exp._id },
        { $set: { data: updatedData, originalData, version: (raw.version ?? 0) + 1 } },
      );

      if (!exp.originalStressAtBreak) {
        yield* mongo.updateOne(
          dbName,
          EXPERIMENTS,
          { _id: exp._id },
          {
            $set: {
              originalStressAtBreak: exp.stressAtBreak,
              originalToughness: exp.toughness,
              originalOffsetYieldStress: exp.offsetYieldStress,
              originalModulus: exp.modulus,
              originalSpecimenDiameter: exp.specimenDiameter,
            },
          },
        );
      }

      yield* mongo.updateOne(
        dbName,
        EXPERIMENTS,
        { _id: exp._id },
        {
          $set: {
            version: (exp.version ?? 0) + 1,
            lastConversionDate: stamp(),
            lastConversionRatio: conv.ratio,
            stressAtBreak: exp.stressAtBreak * conv.ratio,
            toughness: exp.toughness * conv.ratio,
            offsetYieldStress: exp.offsetYieldStress * conv.ratio,
            modulus: exp.modulus * conv.ratio,
            specimenDiameter: exp.specimenDiameter / Math.sqrt(conv.ratio),
          },
          $push: {
            logbook: logbook("Updated data points based on diameter conversion", `Ratio: ${conv.ratio}`),
          },
        },
      );
    }

    for (const t of data.traits ?? []) {
      const entry = yield* mongo.findOne(dbName, TRAITS, { _id: new ObjectId(t.id) });
      if (!entry) continue;
      yield* mongo.updateOne(
        dbName,
        TRAITS,
        { _id: entry._id },
        {
          $set: {
            value: t.value,
            diameterConversion: {
              oldDiameters: conv.oldDiameters,
              newDiameters: conv.newDiameters,
              oldCrossSection: conv.oldCrossSection,
              newCrossSection: conv.newCrossSection,
              ratio: conv.ratio,
              date: stamp(),
            },
            recentChangeDate: stamp(),
          },
          $push: {
            logbook: logbook(
              `Converted value from ${entry.value} to ${String(t.value)} based on diameter change`,
              `Ratio: ${conv.ratio}`,
            ),
          },
        },
      );
    }

    return yield* ok({ message: "Traits and experiments updated successfully" });
  });

const resetConversion = (dbName: string, data: PostData) =>
  Effect.gen(function* () {
    const first = yield* firstTraitSample(dbName, data);
    const mongo = yield* Mongo;

    const experiments = yield* mongo.find(dbName, EXPERIMENTS, { sampleId: first.sampleId });
    for (const exp of experiments) {
      const raw = yield* mongo.findOne(dbName, RAWDATA, { experimentId: exp._id });
      if (!raw || !raw.originalData) continue;
      yield* mongo.updateOne(
        dbName,
        RAWDATA,
        { experimentId: exp._id },
        { $set: { data: raw.originalData, version: (raw.version ?? 0) + 1 } },
      );
      yield* mongo.updateOne(
        dbName,
        EXPERIMENTS,
        { _id: exp._id },
        {
          $set: {
            version: (exp.version ?? 0) + 1,
            stressAtBreak: exp.originalStressAtBreak,
            toughness: exp.originalToughness,
            offsetYieldStress: exp.originalOffsetYieldStress,
            modulus: exp.originalModulus,
            specimenDiameter: exp.originalSpecimenDiameter,
          },
          $unset: {
            lastConversionDate: "",
            lastConversionRatio: "",
            originalStressAtBreak: "",
            originalToughness: "",
            originalOffsetYieldStress: "",
            originalModulus: "",
            originalSpecimenDiameter: "",
          },
          $push: { logbook: logbook("Reset data points to original values") },
        },
      );
    }

    for (const t of data.traits ?? []) {
      const entry = yield* mongo.findOne(dbName, TRAITS, { _id: new ObjectId(t.id) });
      if (!entry || !entry.diameterConversion) continue;
      const original = entry.value / entry.diameterConversion.ratio;
      yield* mongo.updateOne(
        dbName,
        TRAITS,
        { _id: entry._id },
        {
          $set: { value: original, recentChangeDate: stamp() },
          $push: {
            logbook: logbook(
              "Reset value to original value before diameter conversion",
              `Previous ratio: ${entry.diameterConversion.ratio}`,
            ),
          },
          $unset: { diameterConversion: "" },
        },
      );
    }

    return yield* ok({ message: "Traits and experiments reset successfully" });
  });

export const handleTraitPost = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const authName = (yield* currentSession).name ?? "unknown";
    const data = yield* decodeBody(PostBody)(request);

    switch (data.method) {
      case "update":
        return yield* updateTrait(dbName, data);
      case "setfield":
        return yield* setTraitField(dbName, authName, data);
      case "incrementfield":
        return yield* incrementTraitField(dbName, authName, data);
      case "conversion":
        return yield* applyConversion(dbName, data);
      case "reset":
        return yield* resetConversion(dbName, data);
      case "create":
      default:
        return yield* createTrait(dbName, authName, data);
    }
  });

const DeleteBody = Schema.Struct({ id: Schema.String });

export const deleteTrait = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    yield* requireCapability("traits.delete");
    const { id } = yield* decodeBody(DeleteBody)(request);
    if (!isHexId(id)) return yield* Effect.fail(new ValidationError({ message: "Invalid trait id" }));

    const mongo = yield* Mongo;
    const result = yield* mongo.deleteOne(dbName, TRAITS, { _id: new ObjectId(id) });
    if (result.deletedCount === 0) return yield* Effect.fail(new NotFoundError({ resource: "Trait", id }));
    return yield* ok({ message: "Trait deleted successfully" });
  });

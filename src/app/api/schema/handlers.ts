import { Effect } from "effect";
import { ok, currentSession, currentDatabase, Mongo, ValidationError } from "@/lib/effect";
import { isServiceRequest } from "@/app/api/utils/verifyServiceKey";
import type { NextRequest } from "next/server";

const EXCLUDE_FIELDS = new Set([
  "_id",
  "logbook",
  "recentChangeDate",
  "__v",
  "parentId",
  "responsible",
  "sampleId",
  "animalId",
  "fileId",
  "filesId",
  "data",
  "image",
]);

const COMPUTED = {
  samples: ["responsibleName", "parentName"],
  traits: ["responsibleName", "sampleName", "animalName"],
  experiments: ["responsibleName", "sampleName", "animalName"],
};

const liveColumns = (dbName: string, collection: string) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    const docs = yield* mongo.find(dbName, collection, {}, { limit: 30 });
    const keys = new Set<string>();
    for (const doc of docs) for (const key of Object.keys(doc)) keys.add(key);
    return [...keys].filter((key) => !EXCLUDE_FIELDS.has(key));
  });

type ConfigEntry = { value?: string; label?: string; unit?: string; fields?: unknown };

const configData = (dbName: string, type: string) =>
  Effect.map(
    Effect.flatMap(Mongo, (mongo) => mongo.findOne(dbName, "config", { type })),
    (doc) => (Array.isArray(doc?.data) ? (doc!.data as ConfigEntry[]) : []),
  );

/** A sample type's configured `fields` list, flattened to key names (`{key}` objects included). */
const fieldKeys = (fields: unknown): string[] =>
  Array.isArray(fields)
    ? fields
        .map((f) => (typeof f === "string" ? f : (f as { key?: string })?.key))
        .filter((k): k is string => !!k)
    : [];

export const getSchema = (request: Request) =>
  Effect.gen(function* () {
    const dbParam = new URL(request.url).searchParams.get("dbName");

    let dbName: string;
    if (isServiceRequest(request as NextRequest)) {
      if (!dbParam) {
        return yield* Effect.fail(
          new ValidationError({ message: "dbName is required for service requests" }),
        );
      }
      dbName = dbParam;
    } else {
      yield* currentSession;
      dbName = dbParam ?? (yield* currentDatabase);
    }

    const [sampleCols, traitCols, experimentCols, sampleTypesCfg, traitTypesCfg, subsampleTypesCfg] =
      yield* Effect.all([
        liveColumns(dbName, "samples"),
        liveColumns(dbName, "traits"),
        liveColumns(dbName, "experiments"),
        configData(dbName, "sampletypes"),
        configData(dbName, "traittypes"),
        configData(dbName, "samplesubtypes"),
      ]);

    const sampleSection = (label: string, path: string) => ({
      label,
      path,
      columns: [...sampleCols, ...COMPUTED.samples],
    });

    return yield* ok({
      routes: [
        sampleSection("all samples", "/samples/general"),
        sampleSection("animal samples", "/samples/animal"),
        sampleSection("subsample samples", "/samples/subsample"),
        sampleSection("silk samples", "/samples/silk"),
        sampleSection("preserved samples", "/samples/preserved"),
        sampleSection("plant samples", "/samples/plant"),
        sampleSection("artificial samples", "/samples/artificial"),
        { label: "traits measurements", path: "/traits", columns: [...traitCols, ...COMPUTED.traits] },
        {
          label: "general experiments",
          path: "/experiments/general",
          columns: [...experimentCols, ...COMPUTED.experiments],
        },
      ],
      // The lab's configured record model — the source of truth for what
      // sample/trait types and fields a create operation may use.
      sampleTypes: sampleTypesCfg
        .filter((t) => t.value)
        .map((t) => ({ value: t.value!, label: t.label ?? t.value!, fields: fieldKeys(t.fields) })),
      traitTypes: traitTypesCfg
        .filter((t) => t.value)
        .map((t) => ({ value: t.value!, label: t.label ?? t.value!, unit: t.unit ?? null })),
      subsampleTypes: subsampleTypesCfg
        .filter((t) => t.value)
        .map((t) => ({ value: t.value!, label: t.label ?? t.value! })),
    });
  });

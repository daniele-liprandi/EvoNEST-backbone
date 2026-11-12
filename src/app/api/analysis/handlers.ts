import { Effect, Schema } from "effect";
import type { Document } from "mongodb";
import { ok, decodeBody, currentDatabase, currentSession, Mongo, attempt, ValidationError } from "@/lib/effect";
import { convertMeasurement, getDefaultUnitForQuantity } from "@/utils/unitConversion";
import { buildDimensions, dimensionsFor, type Dimension, type Source } from "@/lib/analysis/dimensions";
import { applyFilters, NOT_RECORDED, pivot, type AnalysisRecord } from "@/lib/analysis/pivot";

const SAMPLE_PROJECTION = { logbook: 0, image: 0, lastModified: 0 };

type Config = { value?: string; label?: string; unit?: string };

const configData = (dbName: string, type: string) =>
  Effect.map(
    Effect.flatMap(Mongo, (mongo) => mongo.findOne(dbName, "config", { type })),
    (doc) => (Array.isArray(doc?.data) ? (doc!.data as unknown[]) : []),
  );

const loadContext = (dbName: string) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    const samplesColl = yield* mongo.collection(dbName, "samples");
    const [samples, users, sampleTypes] = yield* Effect.all([
      attempt(() => samplesColl.find({}, { projection: SAMPLE_PROJECTION }).toArray(), "samples.find"),
      mongo.find("usersdb", "users"),
      configData(dbName, "sampletypes"),
    ]);
    const samplesById = new Map(samples.map((s) => [String(s._id), s]));
    const userNames = new Map(users.map((u) => [String(u._id), String(u.name ?? "")]));
    return { samples, samplesById, userNames, dimensions: buildDimensions(sampleTypes) };
  });

const record = (
  dims: Dimension[],
  ctx: { sample: Document; trait?: Document; samplesById: Map<string, Document>; userNames: Map<string, string> },
  value: number | null,
): AnalysisRecord => ({ dims: Object.fromEntries(dims.map((d) => [d.id, d.get(ctx)])), value });

const parseSource = (raw: string | null | undefined): Source => (raw === "samples" ? "samples" : "traits");

export const analysisOptions = (request: Request) =>
  Effect.gen(function* () {
    yield* currentSession;
    const dbName = yield* currentDatabase;
    const source = parseSource(new URL(request.url).searchParams.get("source"));
    const mongo = yield* Mongo;
    const { samples, samplesById, userNames, dimensions } = yield* loadContext(dbName);
    const dims = dimensionsFor(dimensions, source);

    const traitsColl = yield* mongo.collection(dbName, "traits");
    const [traitTypesConfig, counts] = yield* Effect.all([
      configData(dbName, "traitquantities"),
      attempt(
        () =>
          traitsColl
            .aggregate<{ _id: string; count: number; units: unknown[] }>([
              { $match: { quantity: { $type: "string" } } },
              { $group: { _id: "$quantity", count: { $sum: 1 }, units: { $addToSet: "$unit" } } },
            ])
            .toArray(),
        "traits.aggregate quantities",
      ),
    ]);

    // Trait-only dimensions take their values from the traits
    const values = new Map(dims.map((d) => [d.id, new Set<string>()]));
    for (const sample of samples) {
      for (const d of dims) {
        if (!d.sources.includes("samples")) continue;
        values.get(d.id)!.add(d.get({ sample, samplesById, userNames }) ?? NOT_RECORDED);
      }
    }
    if (source === "traits") {
      const traitOnly = dims.filter((d) => !d.sources.includes("samples"));
      if (traitOnly.length) {
        const traits = yield* attempt(
          () => traitsColl.find({}, { projection: Object.fromEntries(traitOnly.map((d) => [d.id, 1])) }).toArray(),
          "traits.find dimension values",
        );
        for (const trait of traits) {
          for (const d of traitOnly) values.get(d.id)!.add(d.get({ sample: {}, trait, samplesById, userNames }) ?? NOT_RECORDED);
        }
      }
    }

    const configured = traitTypesConfig as Config[];
    const countBy = new Map(counts.map((c) => [c._id, c.count]));
    const unitsBy = new Map(counts.map((c) => [c._id, c.units.filter((u): u is string => typeof u === "string" && u !== "").sort()]));
    const quantities = [
      ...configured.filter((t) => t.value).map((t) => ({ value: t.value!, label: t.label ?? t.value!, unit: t.unit ?? null })),
      ...[...countBy.keys()]
        .filter((q) => !configured.some((t) => t.value === q))
        .sort()
        .map((q) => ({ value: q, label: q, unit: null })),
    ].map((q) => ({ ...q, count: countBy.get(q.value) ?? 0, units: unitsBy.get(q.value) ?? [] }));

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    return yield* ok({
      source,
      dimensions: dims.map((d) => ({
        id: d.id,
        label: d.label,
        values: [...values.get(d.id)!].sort((a, b) =>
          a === NOT_RECORDED ? 1 : b === NOT_RECORDED ? -1 : collator.compare(a, b),
        ),
      })),
      quantities,
    });
  });

const Body = Schema.Struct({
  source: Schema.optional(Schema.Literal("samples", "traits")),
  rows: Schema.optional(Schema.Array(Schema.String)),
  column: Schema.optional(Schema.NullOr(Schema.String)),
  quantity: Schema.optional(Schema.String),
  filters: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Array(Schema.String) })),
  unitConversion: Schema.optional(Schema.Boolean),
});

export const runAnalysis = (request: Request) =>
  Effect.gen(function* () {
    yield* currentSession;
    const started = Date.now();
    const body = yield* decodeBody(Body)(request);
    const source: Source = body.source ?? "traits";
    const rows = [...(body.rows ?? [])];
    const column = body.column ?? null;
    const filters = Object.fromEntries(Object.entries(body.filters ?? {}).map(([k, v]) => [k, [...v]]));
    if (source === "traits" && !body.quantity) {
      return yield* Effect.fail(new ValidationError({ message: "quantity is required for a trait summary" }));
    }

    const dbName = yield* currentDatabase;
    const mongo = yield* Mongo;
    const { samples, samplesById, userNames, dimensions } = yield* loadContext(dbName);
    const dims = dimensionsFor(dimensions, source);
    const known = new Set(dims.map((d) => d.id));
    const unknown = [...rows, ...(column ? [column] : []), ...Object.keys(filters)].filter((id) => !known.has(id));
    if (unknown.length) {
      return yield* Effect.fail(new ValidationError({ message: `Unknown dimension: ${unknown.join(", ")}` }));
    }

    let records: AnalysisRecord[];
    let unit = "";
    if (source === "samples") {
      records = samples.map((sample) => record(dims, { sample, samplesById, userNames }, null));
    } else {
      const quantity = body.quantity!;
      const traitTypes = (yield* configData(dbName, "traitquantities")) as Config[];
      // Without a config, the built-in base units are used
      const baseUnitsConfig = yield* configData(dbName, "baseunits");
      const baseUnits = baseUnitsConfig.length ? baseUnitsConfig : undefined;
      const target = getDefaultUnitForQuantity(quantity, traitTypes) as string | null;
      const convert = body.unitConversion ?? true;
      unit = convert ? target ?? "" : "";
      const traitsColl = yield* mongo.collection(dbName, "traits");
      const traits = yield* attempt(() => traitsColl.find({ quantity }).toArray(), "traits.find quantity");
      records = [];
      for (const trait of traits) {
        const sample = samplesById.get(String(trait.sampleId ?? ""));
        // Traits of deleted samples are skipped
        if (!sample) continue;
        let value = typeof trait.value === "number" ? trait.value : Number(trait.value);
        if (!Number.isFinite(value)) continue;
        if (convert && target && trait.unit && trait.unit !== target) {
          // Values with incompatible units are kept as stored
          value = (convertMeasurement(value, trait.unit, target, baseUnits) as number | null) ?? value;
        }
        records.push(record(dims, { sample, trait, samplesById, userNames }, value));
      }
    }

    const filtered = applyFilters(records, filters);
    return yield* ok({
      source,
      quantity: body.quantity ?? null,
      unit,
      rowDimensions: rows,
      column,
      ...pivot(filtered, rows, column),
      metadata: {
        total: records.length,
        matched: filtered.length,
        processingTime: `${Date.now() - started}ms`,
      },
    });
  });

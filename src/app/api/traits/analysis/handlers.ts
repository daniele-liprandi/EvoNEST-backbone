import { Effect, Schema } from "effect";
import type { Document } from "mongodb";
import { ok, decodeBody, currentDatabase, Mongo, attempt, ValidationError } from "@/lib/effect";
import { convertMeasurement, getDefaultUnitForTraitType } from "@/utils/unitConversion";

const calculateStatistics = (values: number[]) => {
  const valid = values.filter((v) => v !== null && v !== undefined && !isNaN(v));
  if (valid.length === 0) return null;

  const sorted = [...valid].sort((a, b) => a - b);
  const count = valid.length;
  const mean = valid.reduce((acc, v) => acc + v, 0) / count;
  const variance = valid.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
  const stddev = Math.sqrt(variance);
  const median =
    count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];

  return {
    mean: parseFloat(mean.toFixed(3)),
    stddev: parseFloat(stddev.toFixed(3)),
    min: parseFloat(sorted[0].toFixed(3)),
    max: parseFloat(sorted[count - 1].toFixed(3)),
    median: parseFloat(median.toFixed(3)),
    count,
  };
};

interface AnalysisFilters {
  sampleSubtypes?: string[];
  nfibres?: string[];
}

const PostBody = Schema.Struct(
  {
    traitType: Schema.optional(Schema.String),
    groupBy: Schema.optional(Schema.String),
    filters: Schema.optional(Schema.Object),
    unitConversion: Schema.optional(Schema.Boolean),
  },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);

// Built-in groupings, plus any configured sample field is `$sample.<key>`.
const BUILTIN_GROUP_FIELDS: Record<string, unknown> = {
  family: "$sample.family",
  genus: "$sample.genus",
  species: "$sample.species",
  fullSpecies: "$fullSpecies",
  subsampletype: "$sample.subsampletype",
  // legacy alias kept for older clients
  sampleSubTypes: "$sample.subsampletype",
  fullSpeciesSubsampletype: "$fullSpeciesSubsampletype",
};

const buildPipeline = (
  traitType: string,
  groupBy: string,
  filters: AnalysisFilters,
): Document[] => {
  const pipeline: Document[] = [
    { $match: { type: traitType } },
    {
      $addFields: {
        sampleObjectId: {
          $cond: {
            if: { $and: [{ $ne: ["$sampleId", ""] }, { $ne: ["$sampleId", null] }] },
            then: {
              $cond: {
                if: { $eq: [{ $type: "$sampleId" }, "objectId"] },
                then: "$sampleId",
                else: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: [{ $type: "$sampleId" }, "string"] },
                        { $eq: [{ $strLenCP: "$sampleId" }, 24] },
                      ],
                    },
                    then: { $toObjectId: "$sampleId" },
                    else: null,
                  },
                },
              },
            },
            else: null,
          },
        },
      },
    },
    { $match: { sampleObjectId: { $ne: null } } },
    {
      $lookup: { from: "samples", localField: "sampleObjectId", foreignField: "_id", as: "sample" },
    },
    { $unwind: "$sample" },
    // `silktype` is the legacy silk-only name for the generic `subsampletype`.
    // Normalise once so every filter and grouping downstream is type-agnostic.
    { $addFields: { "sample.subsampletype": { $ifNull: ["$sample.subsampletype", "$sample.silktype"] } } },
  ];

  const matchConditions: Record<string, unknown> = {};
  const orConditions: unknown[] = [];

  if (filters.sampleSubtypes && filters.sampleSubtypes.length > 0) {
    const hasNotDeclared = filters.sampleSubtypes.includes("__NOT_DECLARED__");
    const regular = filters.sampleSubtypes.filter((st) => st !== "__NOT_DECLARED__");
    if (hasNotDeclared && regular.length > 0) {
      orConditions.push({
        $or: [
          { "sample.subsampletype": { $in: regular } },
          { "sample.subsampletype": null },
          { "sample.subsampletype": "" },
          { "sample.subsampletype": { $exists: false } },
        ],
      });
    } else if (hasNotDeclared) {
      orConditions.push({
        $or: [
          { "sample.subsampletype": null },
          { "sample.subsampletype": "" },
          { "sample.subsampletype": { $exists: false } },
        ],
      });
    } else {
      matchConditions["sample.subsampletype"] = { $in: regular };
    }
  }

  if (filters.nfibres && filters.nfibres.length > 0) {
    const hasNotDeclared = filters.nfibres.includes("__NOT_DECLARED__");
    const regular = filters.nfibres.filter((nf) => nf !== "__NOT_DECLARED__");
    const regex = regular.map((nf) => new RegExp(`^${nf}$`, "i"));
    if (hasNotDeclared && regular.length > 0) {
      orConditions.push({
        $or: [
          { nfibres: { $in: regex } },
          { nfibres: null },
          { nfibres: "" },
          { nfibres: { $exists: false } },
        ],
      });
    } else if (hasNotDeclared) {
      orConditions.push({
        $or: [{ nfibres: null }, { nfibres: "" }, { nfibres: { $exists: false } }],
      });
    } else {
      matchConditions.nfibres = { $in: regex };
    }
  }

  if (orConditions.length === 1) {
    Object.assign(matchConditions, orConditions[0]);
  } else if (orConditions.length > 1) {
    matchConditions.$and = orConditions;
  }
  if (Object.keys(matchConditions).length > 0) pipeline.push({ $match: matchConditions });

  const fullSpecies = {
    $cond: {
      if: { $and: ["$sample.genus", "$sample.species"] },
      then: { $concat: ["$sample.genus", " ", "$sample.species"] },
      else: {
        $cond: {
          if: "$sample.genus",
          then: "$sample.genus",
          else: { $cond: { if: "$sample.species", then: "$sample.species", else: "Unknown" } },
        },
      },
    },
  };

  pipeline.push({
    $addFields: {
      fullSpecies,
      fullSpeciesSubsampletype: {
        $concat: [
          fullSpecies,
          " - ",
          { $cond: { if: "$sample.subsampletype", then: "$sample.subsampletype", else: "Unknown" } },
        ],
      },
    },
  });

  const groupField =
    groupBy === "all" ? "All" : BUILTIN_GROUP_FIELDS[groupBy] ?? `$sample.${groupBy}`;

  pipeline.push({
    $group: {
      _id: groupField,
      // Convert per-document in JS afterwards: SI-prefix conversion depends on
      // each trait's own stored unit, which a pipeline stage can't express.
      values: { $push: { measurement: "$measurement", unit: "$unit" } },
      count: { $sum: 1 },
    },
  });
  pipeline.push({ $sort: { _id: 1 } });
  return pipeline;
};

interface RawValue {
  measurement: number;
  unit?: string;
}

export const analyseTraits = (request: Request) =>
  Effect.gen(function* () {
    const startTime = Date.now();
    const data = yield* decodeBody(PostBody)(request);
    const traitType = data.traitType ?? "";
    if (!traitType) return yield* Effect.fail(new ValidationError({ message: "traitType is required" }));

    const groupBy = data.groupBy ?? "all";
    const filters = (data.filters ?? {}) as AnalysisFilters;
    const unitConversion = data.unitConversion ?? true;

    const dbName = yield* currentDatabase;
    const mongo = yield* Mongo;
    const traits = yield* mongo.collection(dbName, "traits");

    const traitTypesConfig =
      ((yield* mongo.findOne(dbName, "config", { type: "traittypes" }))?.data as
        | Array<{ value: string; unit?: string }>
        | undefined) ?? [];
    const baseUnitsConfig = (yield* mongo.findOne(dbName, "config", { type: "baseunits" }))?.data as
      | unknown[]
      | undefined;
    const targetUnit = getDefaultUnitForTraitType(traitType, traitTypesConfig);

    const toDisplayValue = ({ measurement, unit }: RawValue): number => {
      if (!unitConversion || !targetUnit || !unit || unit === targetUnit) return measurement;
      const converted = convertMeasurement(measurement, unit, targetUnit, baseUnitsConfig);
      // incompatible base units -> leave the value as stored
      return converted ?? measurement;
    };

    const pipeline = buildPipeline(traitType, groupBy, filters);
    const aggregation = yield* attempt(
      () => traits.aggregate(pipeline).toArray(),
      "traits.aggregate analysis",
    );

    const results = aggregation
      .map((group) => {
        const values = ((group.values as RawValue[]) ?? []).map(toDisplayValue);
        const stats = calculateStatistics(values);
        const base: Record<string, unknown> = stats
          ? { name: group._id || "Unknown", ...stats }
          : { name: group._id || "Unknown", mean: 0, stddev: 0, min: 0, max: 0, median: 0, count: 0 };

        if (
          groupBy === "fullSpeciesSubsampletype" &&
          typeof group._id === "string" &&
          group._id.includes(" - ")
        ) {
          const [speciesName, subType] = group._id.split(" - ");
          base.name = speciesName;
          base.sampleSubTypes = subType;
        }
        return base;
      })
      .filter((r) => (r.count as number) > 0);

    const totalTraits = yield* attempt(
      () => traits.countDocuments({ type: traitType }),
      "traits.countDocuments",
    );
    const filteredTraits = results.reduce((sum, r) => sum + (r.count as number), 0);

    return yield* ok({
      results,
      unit: unitConversion ? targetUnit ?? "" : "",
      metadata: {
        totalTraits,
        filteredTraits,
        processingTime: `${Date.now() - startTime}ms`,
        groupBy,
        traitType,
      },
    });
  });

const prettifyKey = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

const BUILTIN_GROUP_OPTIONS = [
  { value: "all", label: "Sum of all" },
  { value: "fullSpecies", label: "Full species (genus + species)" },
  { value: "fullSpeciesSubsampletype", label: "Full species + subsample type" },
  { value: "family", label: "Family" },
  { value: "genus", label: "Genus" },
  { value: "species", label: "Species" },
  { value: "subsampletype", label: "Subsample type" },
];
// Sample-type field keys that make no sense as a grouping.
const NON_GROUPABLE_FIELDS = new Set([
  "taxonomy",
  "parent",
  "responsible",
  "date",
  "notes",
  "nomenclature",
  "name",
]);

export const analysisFilterOptions = Effect.gen(function* () {
  const dbName = yield* currentDatabase;
  const mongo = yield* Mongo;
  const traits = yield* mongo.collection(dbName, "traits");
  const samples = yield* mongo.collection(dbName, "samples");

  const [traitTypes, subsampletypes, silktypes, nfibresValues] = yield* Effect.all([
    attempt(() => traits.distinct("type"), "traits.distinct type"),
    attempt(() => samples.distinct("subsampletype"), "samples.distinct subsampletype"),
    attempt(() => samples.distinct("silktype"), "samples.distinct silktype"),
    attempt(() => traits.distinct("nfibres"), "traits.distinct nfibres"),
  ]);

  const sampleTypesConfig =
    ((yield* mongo.findOne(dbName, "config", { type: "sampletypes" }))?.data as
      | Array<{ fields?: Array<string | { key?: string; label?: string }> }>
      | undefined) ?? [];

  const fieldOptions = new Map<string, string>();
  for (const type of sampleTypesConfig) {
    for (const field of type.fields ?? []) {
      const key = typeof field === "string" ? field : field?.key;
      if (!key || NON_GROUPABLE_FIELDS.has(key)) continue;
      if (BUILTIN_GROUP_OPTIONS.some((o) => o.value === key)) continue;
      if (!fieldOptions.has(key)) {
        fieldOptions.set(key, typeof field === "string" ? prettifyKey(key) : field.label ?? prettifyKey(key));
      }
    }
  }

  const cleanNFibres = [
    ...new Set((nfibresValues as unknown[]).filter(Boolean).map((v) => String(v).toLowerCase())),
  ].sort();

  return yield* ok({
    traitTypes: (traitTypes as string[]).sort(),
    sampleSubTypes: [
      ...new Set([...(subsampletypes as string[]), ...(silktypes as string[])].filter(Boolean)),
    ].sort(),
    nfibres: cleanNFibres,
    groupByOptions: [
      ...BUILTIN_GROUP_OPTIONS,
      ...[...fieldOptions].map(([value, label]) => ({ value, label })),
    ],
  });
});

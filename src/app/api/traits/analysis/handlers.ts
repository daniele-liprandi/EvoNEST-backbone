import { Effect, Schema } from "effect";
import type { Document } from "mongodb";
import { ok, decodeBody, currentDatabase, Mongo, attempt, ValidationError } from "@/lib/effect";

// TODO(#164): getDisplayUnit and the Pa->GPa / x100 conversion below are
// hard-coded to a silk-biomechanics workflow. They should read the unit from
// the traittypes config and convert by SI prefix. groupBy is likewise limited
// to silk fields. This conversion keeps the existing behaviour verbatim.

const getDisplayUnit = (traitType: string) => {
  switch (traitType) {
    case "stressAtBreak":
    case "toughness":
    case "modulus":
      return "GPa";
    case "loadAtBreak":
      return "mN";
    case "strainAtBreak":
      return "%";
    case "diameter":
      return "μm";
    default:
      return "";
  }
};

const calculateStatistics = (values: unknown[]) => {
  const valid = values.filter(
    (v): v is number => v !== null && v !== undefined && !isNaN(v as number),
  );
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

const buildPipeline = (
  traitType: string,
  groupBy: string,
  filters: AnalysisFilters,
  unitConversion: boolean,
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
  ];

  const matchConditions: Record<string, unknown> = {};
  const orConditions: unknown[] = [];

  if (filters.sampleSubtypes && filters.sampleSubtypes.length > 0) {
    const hasNotDeclared = filters.sampleSubtypes.includes("__NOT_DECLARED__");
    const regular = filters.sampleSubtypes.filter((st) => st !== "__NOT_DECLARED__");
    if (hasNotDeclared && regular.length > 0) {
      orConditions.push({
        $or: [
          { "sample.silktype": { $in: regular } },
          { "sample.silktype": null },
          { "sample.silktype": "" },
          { "sample.silktype": { $exists: false } },
        ],
      });
    } else if (hasNotDeclared) {
      orConditions.push({
        $or: [
          { "sample.silktype": null },
          { "sample.silktype": "" },
          { "sample.silktype": { $exists: false } },
        ],
      });
    } else {
      matchConditions["sample.silktype"] = { $in: regular };
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
          { $cond: { if: "$sample.silktype", then: "$sample.silktype", else: "Unknown" } },
        ],
      },
      convertedValue: unitConversion
        ? {
            $cond: {
              if: { $in: [traitType, ["stressAtBreak", "toughness", "modulus"]] },
              then: { $divide: ["$measurement", 1000000000] },
              else: {
                $cond: {
                  if: { $eq: [traitType, "strainAtBreak"] },
                  then: { $multiply: ["$measurement", 100] },
                  else: "$measurement",
                },
              },
            },
          }
        : "$measurement",
    },
  });

  const groupFieldByName: Record<string, string> = {
    family: "$sample.family",
    genus: "$sample.genus",
    species: "$sample.species",
    fullSpecies: "$fullSpecies",
    sampleSubTypes: "$sample.silktype",
    fullSpeciesSubsampletype: "$fullSpeciesSubsampletype",
  };
  const groupField = groupBy === "all" ? "All" : groupFieldByName[groupBy] ?? "All";

  pipeline.push({
    $group: { _id: groupField, values: { $push: "$convertedValue" }, count: { $sum: 1 } },
  });
  pipeline.push({ $sort: { _id: 1 } });
  return pipeline;
};

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

    const pipeline = buildPipeline(traitType, groupBy, filters, unitConversion);
    const aggregation = yield* attempt(
      () => traits.aggregate(pipeline).toArray(),
      "traits.aggregate analysis",
    );

    const results = aggregation
      .map((group) => {
        const stats = calculateStatistics(group.values);
        const base: Record<string, unknown> = stats
          ? { name: group._id || "Unknown", ...stats }
          : { name: group._id || "Unknown", mean: 0, stddev: 0, min: 0, max: 0, median: 0, count: 0 };

        if (groupBy === "fullSpeciesSubsampletype" && typeof group._id === "string" && group._id.includes(" - ")) {
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
      unit: unitConversion ? getDisplayUnit(traitType) : "",
      metadata: {
        totalTraits,
        filteredTraits,
        processingTime: `${Date.now() - startTime}ms`,
        groupBy,
        traitType,
      },
    });
  });

export const analysisFilterOptions = Effect.gen(function* () {
  const dbName = yield* currentDatabase;
  const mongo = yield* Mongo;
  const traits = yield* mongo.collection(dbName, "traits");
  const samples = yield* mongo.collection(dbName, "samples");

  const [traitTypes, sampleSubTypes, nfibresValues] = yield* Effect.all([
    attempt(() => traits.distinct("type"), "traits.distinct type"),
    attempt(() => samples.distinct("silktype"), "samples.distinct silktype"),
    attempt(() => traits.distinct("nfibres"), "traits.distinct nfibres"),
  ]);

  const cleanNFibres = [
    ...new Set(nfibresValues.filter(Boolean).map((v) => String(v).toLowerCase())),
  ].sort();

  return yield* ok({
    traitTypes: (traitTypes as string[]).sort(),
    sampleSubTypes: (sampleSubTypes as string[]).filter(Boolean).sort(),
    nfibres: cleanNFibres,
  });
});

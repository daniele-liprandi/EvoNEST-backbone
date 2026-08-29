import { Effect, Schema } from "effect";
import { runRoute, ok, decodeBody, currentDatabase, Mongo, ObjectIdFromHex, InternalError } from "@/lib/effect";
import { analyzeTraitConversion } from "@/utils/unitConversion";

/**
 * @swagger
 * /api/traits/convert-units/preview:
 *   post:
 *     summary: Preview unit conversions without writing (first 10)
 *     tags: [Traits]
 *     responses:
 *       200: { description: "{ totalTraits, willConvert, willSkip, preview }" }
 *       400: { description: Invalid body or trait id }
 *       401: { description: Unauthorized }
 */

const PREVIEW_LIMIT = 10;

const Body = Schema.Struct({ traitIds: Schema.optional(Schema.Array(ObjectIdFromHex)) });

export const previewConversion = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const { traitIds } = yield* decodeBody(Body)(request);
    const mongo = yield* Mongo;

    const traitTypes = yield* mongo.findOne(dbName, "config", { type: "traittypes" });
    if (!traitTypes?.data) {
      return yield* Effect.fail(new InternalError({ message: "Trait types configuration not found" }));
    }
    const baseUnits = (yield* mongo.findOne(dbName, "config", { type: "baseunits" }))?.data ?? null;

    const filter = traitIds?.length ? { _id: { $in: traitIds } } : {};
    const traits = yield* mongo.find(dbName, "traits", filter);

    const preview: Array<Record<string, unknown>> = [];
    let willConvert = 0;
    let willSkip = 0;

    for (const trait of traits) {
      const analysis = analyzeTraitConversion(trait, traitTypes.data, baseUnits);
      if (!analysis.needsConversion || analysis.newValue === null) {
        willSkip++;
        continue;
      }
      willConvert++;
      if (preview.length < PREVIEW_LIMIT) {
        preview.push({
          traitId: trait._id?.toString(),
          sampleId: trait.sampleId?.toString(),
          type: trait.type,
          oldValue: trait.measurement,
          oldUnit: trait.unit,
          newValue: analysis.newValue,
          newUnit: analysis.newUnit,
          date: trait.date,
        });
      }
    }

    return yield* ok({ totalTraits: traits.length, willConvert, willSkip, preview });
  });

export const POST = (request: Request) => runRoute(previewConversion(request));

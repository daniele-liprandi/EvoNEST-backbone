import { Effect, Schema } from "effect";
import {
  runRoute,
  ok,
  decodeBody,
  Auth,
  Mongo,
  ObjectIdFromHex,
  InternalError,
} from "@/lib/effect";
import { analyzeTraitConversion } from "@/utils/unitConversion";

/**
 * @swagger
 * /api/traits/convert-units/preview:
 *   post:
 *     summary: Preview trait unit conversions without applying changes
 *     description: Analyse which traits would be converted and return the first 10, without writing.
 *     tags:
 *       - Traits
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               traitIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Preview generated
 *       400:
 *         description: Invalid request body or trait id
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

const PREVIEW_LIMIT = 10;

const Body = Schema.Struct({
  traitIds: Schema.optional(Schema.Array(ObjectIdFromHex)),
});

export const previewConversion = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* Effect.flatMap(Auth, (auth) => auth.databaseName);
    const { traitIds } = yield* decodeBody(Body)(request);
    const mongo = yield* Mongo;

    const traitTypesConfig = yield* mongo.findOne(dbName, "config", { type: "traittypes" });
    if (!traitTypesConfig?.data) {
      return yield* Effect.fail(new InternalError({ message: "Trait types configuration not found" }));
    }
    const baseUnitsConfig = yield* mongo.findOne(dbName, "config", { type: "baseunits" });
    const baseUnits = baseUnitsConfig?.data ?? null;

    const filter = traitIds && traitIds.length > 0 ? { _id: { $in: traitIds } } : {};
    const traits = yield* mongo.find(dbName, "traits", filter);

    const results = {
      totalTraits: traits.length,
      willConvert: 0,
      willSkip: 0,
      preview: [] as Array<Record<string, unknown>>,
    };

    for (const trait of traits) {
      const analysis = analyzeTraitConversion(trait, traitTypesConfig.data, baseUnits);
      if (analysis.needsConversion && analysis.newValue !== null) {
        results.willConvert++;
        if (results.preview.length < PREVIEW_LIMIT) {
          results.preview.push({
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
      } else {
        results.willSkip++;
      }
    }

    return yield* ok(results);
  });

export const POST = (request: Request) => runRoute(previewConversion(request));

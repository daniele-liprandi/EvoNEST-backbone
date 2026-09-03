import { Effect, Schema } from "effect";
import { ObjectId } from "mongodb";
import { ok, decodeBody, currentDatabase, Mongo, InternalError } from "@/lib/effect";
import { analyzeTraitConversion } from "@/utils/unitConversion";

const CONFIG = "config";
const TRAITS = "traits";

const Body = Schema.Struct({
  traitIds: Schema.optional(Schema.Array(Schema.String)),
});

export const convertUnits = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    // The body is optional; no body means convert every trait.
    const { traitIds } = yield* decodeBody(Body)(request).pipe(
      Effect.orElseSucceed(() => ({ traitIds: undefined as readonly string[] | undefined })),
    );
    const mongo = yield* Mongo;

    const traitTypes = yield* mongo.findOne(dbName, CONFIG, { type: "traittypes" });
    if (!traitTypes?.data) {
      return yield* Effect.fail(new InternalError({ message: "Trait types configuration not found" }));
    }
    const baseUnits = (yield* mongo.findOne(dbName, CONFIG, { type: "baseunits" }))?.data ?? null;

    const filter =
      traitIds && traitIds.length > 0
        ? { _id: { $in: traitIds.map((id) => new ObjectId(id)) } }
        : {};
    const traits = yield* mongo.find(dbName, TRAITS, filter);

    let converted = 0;
    let skipped = 0;
    const details: Record<string, unknown>[] = [];

    for (const trait of traits) {
      const analysis = analyzeTraitConversion(trait, traitTypes.data, baseUnits);
      details.push({
        traitId: String(trait._id),
        type: trait.type,
        converted: analysis.needsConversion,
        oldValue: trait.measurement,
        oldUnit: trait.unit,
        newValue: analysis.newValue,
        newUnit: analysis.newUnit,
        reason: analysis.reason,
      });

      if (analysis.needsConversion && analysis.newValue !== null) {
        const now = new Date().toISOString();
        const result = yield* mongo.updateOne(
          dbName,
          TRAITS,
          { _id: trait._id },
          {
            $set: { measurement: analysis.newValue, unit: analysis.newUnit, recentChangeDate: now },
            $push: {
              logbook: `${now}: Unit converted from ${trait.unit} to ${analysis.newUnit} (${trait.measurement} to ${analysis.newValue})`,
            },
          },
        );
        if (result.modifiedCount > 0) converted++;
      } else {
        skipped++;
      }
    }

    return yield* ok({ success: true, totalTraits: traits.length, converted, skipped, details });
  });

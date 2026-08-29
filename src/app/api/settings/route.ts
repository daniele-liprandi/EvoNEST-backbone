import { Effect, Schema } from "effect";
import { runRoute, ok, decodeBody, currentDatabase, currentSession, Mongo, NonEmptyString } from "@/lib/effect";

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: The lab's main settings (id generation and lab info)
 *     tags: [Settings]
 *     responses:
 *       200: { description: "{ success, data }" }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Replace the lab's main settings
 *     tags: [Settings]
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Invalid body }
 *       401: { description: Unauthorized }
 */

const SETTINGS = "settings";

const DEFAULT_SETTINGS = {
  idGeneration: {
    combinations: [[3, 3], [3, 4], [3, 5], [4, 3], [4, 4], [5, 3], [5, 4], [4, 5]],
    defaultGenusLength: 3,
    defaultSpeciesLength: 3,
    maxGenusLength: 6,
    maxSpeciesLength: 6,
    startingNumber: 1,
    useCollisionAvoidance: true,
    numberPadding: 0,
  },
  labInfo: { name: "", location: "", latitude: null, longitude: null },
};

export const getSettings = Effect.gen(function* () {
  yield* currentSession;
  const dbName = yield* currentDatabase;
  const mongo = yield* Mongo;

  const settings = yield* mongo.findOne(dbName, SETTINGS, { type: "main" });
  if (!settings) return yield* ok({ success: true, data: DEFAULT_SETTINGS });
  return yield* ok({
    success: true,
    data: { idGeneration: settings.idGeneration, labInfo: settings.labInfo },
  });
});

const IdGeneration = Schema.Struct(
  {
    combinations: Schema.Array(Schema.Tuple(Schema.Number, Schema.Number)).pipe(Schema.minItems(1)),
    defaultGenusLength: Schema.Number,
    defaultSpeciesLength: Schema.Number,
    startingNumber: Schema.Number,
    useCollisionAvoidance: Schema.Boolean,
    numberPadding: Schema.Number,
  },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);

const LabInfo = Schema.Struct(
  {
    name: NonEmptyString,
    location: NonEmptyString,
    latitude: Schema.NullOr(Schema.Number),
    longitude: Schema.NullOr(Schema.Number),
  },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);

const Body = Schema.Struct({ idGeneration: IdGeneration, labInfo: LabInfo });

export const updateSettings = (request: Request) =>
  Effect.gen(function* () {
    const authName = (yield* currentSession).name ?? "unknown user";
    const dbName = yield* currentDatabase;
    const { idGeneration, labInfo } = yield* decodeBody(Body)(request);
    const mongo = yield* Mongo;

    const result = yield* mongo.updateOne(
      dbName,
      SETTINGS,
      { type: "main" },
      {
        $set: {
          type: "main",
          idGeneration,
          labInfo,
          lastModified: new Date().toISOString(),
          modifiedBy: authName,
          version: 1,
        },
      },
      { upsert: true },
    );

    return yield* ok({
      success: true,
      message: "Settings updated successfully",
      data: {
        acknowledged: result.acknowledged,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
      },
    });
  });

export const GET = () => runRoute(getSettings);
export const POST = (request: Request) => runRoute(updateSettings(request));

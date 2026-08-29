import { Effect } from "effect";
import { runRoute, ok, currentSession, currentDatabase, Mongo, attempt } from "@/lib/effect";
import { DEFAULT_CONFIGS } from "@/shared/config/default-types";

/**
 * @swagger
 * /api/config/types/seed:
 *   post:
 *     summary: Replace every configuration with its default
 *     tags: [Configuration]
 *     responses:
 *       200: { description: "{ message, results: [{ type, action }] }" }
 *       401: { description: Unauthorized }
 */
export const seedConfigs = Effect.gen(function* () {
  const modifiedBy = (yield* currentSession).name ?? "system";
  const dbName = yield* currentDatabase;
  const mongo = yield* Mongo;
  const config = yield* mongo.collection(dbName, "config");

  const results = yield* Effect.forEach(Object.entries(DEFAULT_CONFIGS), ([type, data]) =>
    attempt(
      () =>
        config.replaceOne(
          { type },
          { type, data, version: 1, lastModified: new Date().toISOString(), modifiedBy, isDefault: true },
          { upsert: true },
        ),
      `config.replaceOne ${type}`,
    ).pipe(Effect.map((r) => ({ type, action: r.upsertedCount > 0 ? "created" : "updated" }))),
  );

  return yield* ok({ message: "Database set to defaults completed", results });
});

export const POST = () => runRoute(seedConfigs);

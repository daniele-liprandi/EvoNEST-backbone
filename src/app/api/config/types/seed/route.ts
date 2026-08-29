import { Effect } from "effect";
import { runRoute, ok, Auth, Mongo, attempt } from "@/lib/effect";
import { DEFAULT_CONFIGS } from "@/shared/config/default-types";

/**
 * @swagger
 * /api/config/types/seed:
 *   post:
 *     summary: Seed the database with default configurations
 *     description: Replace existing configurations with defaults, or create them if missing
 *     tags:
 *       - Configuration
 *     responses:
 *       200:
 *         description: Configurations set to defaults
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

export const seedConfigs = Effect.gen(function* () {
  const auth = yield* Auth;
  const session = yield* auth.session;
  const dbName = yield* auth.databaseName;
  const modifiedBy = session.name ?? "system";

  const configs = yield* Effect.flatMap(Mongo, (mongo) => mongo.collection(dbName, "config"));

  const results = yield* Effect.forEach(Object.entries(DEFAULT_CONFIGS), ([type, data]) =>
    attempt(
      () =>
        configs.replaceOne(
          { type },
          {
            type,
            data,
            version: 1,
            lastModified: new Date().toISOString(),
            modifiedBy,
            isDefault: true,
          },
          { upsert: true },
        ),
      `config.replaceOne ${type}`,
    ).pipe(Effect.map((result) => ({ type, action: result.upsertedCount > 0 ? "created" : "updated" }))),
  );

  return yield* ok({ message: "Database set to defaults completed", results });
});

export const POST = () => runRoute(seedConfigs);

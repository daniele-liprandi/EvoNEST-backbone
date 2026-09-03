import { Effect, Schema } from "effect";
import {
  ok,
  decodeBody,
  currentSession,
  currentDatabase,
  requireCapability,
  Mongo,
  attempt,
  ValidationError,
} from "@/lib/effect";
import { DEFAULT_CONFIGS } from "@/shared/config/default-types";
import { resolvePreset } from "@/shared/config/lab-presets";

const Body = Schema.Struct({
  preset: Schema.optional(Schema.String),
  configs: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  labName: Schema.optional(Schema.String),
  labDescription: Schema.optional(Schema.String),
});
type SeedBody = Schema.Schema.Type<typeof Body>;

/** Which config set to write: an explicit `configs` map, a named preset, or the shipped defaults. */
const resolveConfigSet = (body: SeedBody) =>
  Effect.gen(function* () {
    if (body.configs && typeof body.configs === "object") {
      return { ...DEFAULT_CONFIGS, ...body.configs } as Record<string, unknown>;
    }
    if (body.preset && body.preset !== "generic") {
      const resolved = resolvePreset(body.preset);
      if (!resolved) {
        return yield* Effect.fail(new ValidationError({ message: `Unknown preset "${body.preset}"` }));
      }
      return resolved as Record<string, unknown>;
    }
    return DEFAULT_CONFIGS as Record<string, unknown>;
  });

export const seedConfigs = (request: Request) =>
  Effect.gen(function* () {
    const modifiedBy = (yield* currentSession).name ?? "system";
    const dbName = yield* currentDatabase;
    yield* requireCapability("config.seed");

    const body = yield* decodeBody(Body)(request).pipe(Effect.orElseSucceed(() => ({}) as SeedBody));
    const configSet = yield* resolveConfigSet(body);

    const mongo = yield* Mongo;

    // The wizard passes the lab name and a free-text description; keep them on
    // the main settings without touching the rest of that document.
    if (body.labName || body.labDescription) {
      const labInfo: Record<string, string> = {};
      if (body.labName) labInfo["labInfo.name"] = String(body.labName);
      if (body.labDescription) labInfo["labInfo.description"] = String(body.labDescription);
      yield* mongo.updateOne(
        dbName,
        "settings",
        { type: "main" },
        { $set: { type: "main", ...labInfo } },
        { upsert: true },
      );
    }

    const config = yield* mongo.collection(dbName, "config");
    const results = yield* Effect.forEach(Object.entries(configSet), ([type, data]) =>
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

import { Effect, Schema } from "effect";
import { ok, decodeBody, currentDatabase, currentSession, requireCapability, Mongo, attempt, ValidationError } from "@/lib/effect";

const TRAITS = "traits";
const stamp = () => new Date().toISOString();

export const listStoredQuantities = Effect.gen(function* () {
  yield* currentSession;
  const dbName = yield* currentDatabase;
  const mongo = yield* Mongo;
  const traits = yield* mongo.collection(dbName, TRAITS);
  const rows = yield* attempt(
    () =>
      traits
        .aggregate<{ _id: string; count: number }>([
          { $match: { quantity: { $type: "string" } } },
          { $group: { _id: "$quantity", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
    "traits.aggregate quantities",
  );
  return yield* ok(rows.map((r) => ({ quantity: r._id, count: r.count })));
});

const RenameBody = Schema.Struct({ from: Schema.String, to: Schema.String });

/** Move stored traits to another quantity: a mapping only affects later uploads. */
export const renameStoredQuantity = (request: Request) =>
  Effect.gen(function* () {
    yield* requireCapability("config.edit");
    const dbName = yield* currentDatabase;
    const by = (yield* currentSession).name ?? "unknown user";
    const { from, to } = yield* decodeBody(RenameBody)(request);
    if (!from || !to || from === to) {
      return yield* Effect.fail(new ValidationError({ message: "from and to must be two different quantities" }));
    }
    const mongo = yield* Mongo;
    const traits = yield* mongo.collection(dbName, TRAITS);
    const result = yield* attempt(
      () =>
        traits.updateMany(
          { quantity: from },
          { $set: { quantity: to }, $push: { logbook: [stamp(), `Quantity changed from ${from} to ${to} by ${by}`] } as never },
        ),
      "traits.updateMany quantity",
    );
    return yield* ok({ renamed: result.modifiedCount });
  });

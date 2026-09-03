import { Effect, Schema } from "effect";
import { ok, decodeBody, currentDatabase, Mongo, requireFound, ObjectIdFromHex } from "@/lib/effect";

const Body = Schema.Struct({
  name: Schema.optional(Schema.String),
  id: Schema.optional(ObjectIdFromHex),
  type: Schema.optional(Schema.String),
}).pipe(
  Schema.filter((b) => b.name != null || b.id != null || b.type != null, {
    message: () => "At least one of name, id, or type is required",
  }),
);

export const findSample = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const { name, id, type } = yield* decodeBody(Body)(request);
    const mongo = yield* Mongo;

    const query: Record<string, unknown> = {};
    if (name) query.name = name;
    if (id) query._id = id;
    if (type) query.type = type;

    const sample = yield* mongo.findOne(dbName, "samples", query);
    return yield* ok(yield* requireFound("Sample")(sample));
  });

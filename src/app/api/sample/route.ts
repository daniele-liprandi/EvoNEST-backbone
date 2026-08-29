import { Effect, Schema } from "effect";
import { runRoute, ok, decodeBody, Auth, Mongo, requireFound, ObjectIdFromHex } from "@/lib/effect";

/**
 * @swagger
 * /api/sample:
 *   post:
 *     summary: Retrieve a single sample
 *     description: Get one sample by name, id, and/or type
 *     tags:
 *       - Sample
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               id:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sample found
 *       400:
 *         description: No query parameter, or an invalid id
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sample not found
 *       500:
 *         description: Server error
 */

const Body = Schema.Struct({
  name: Schema.optional(Schema.String),
  id: Schema.optional(ObjectIdFromHex),
  type: Schema.optional(Schema.String),
}).pipe(
  Schema.filter((body) => body.name != null || body.id != null || body.type != null, {
    message: () => "At least one of name, id, or type is required",
  }),
);

export const findSample = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* Effect.flatMap(Auth, (auth) => auth.databaseName);
    const { name, id, type } = yield* decodeBody(Body)(request);

    const query: Record<string, unknown> = {};
    if (name) query.name = name;
    if (id) query._id = id;
    if (type) query.type = type;

    const sample = yield* Effect.flatMap(Mongo, (mongo) => mongo.findOne(dbName, "samples", query));
    const found = yield* requireFound("Sample")(sample);
    return yield* ok(found);
  });

export const POST = (request: Request) => runRoute(findSample(request));

import { Effect } from "effect";
import { ObjectId } from "mongodb";
import { runRoute, ok, currentDatabase, Mongo, attempt, requireFound, ValidationError } from "@/lib/effect";

/**
 * @swagger
 * /api/experiment/{id}:
 *   get:
 *     summary: One experiment by id
 *     tags: [Experiments]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: query, name: includeRawData, schema: { type: boolean } }
 *       - { in: query, name: includeOriginalData, schema: { type: boolean } }
 *     responses:
 *       200: { description: Experiment }
 *       400: { description: Invalid id }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */

const EXPERIMENTS = "experiments";

export const getExperiment = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const url = new URL(request.url);
    const id = url.pathname.split("/").pop() ?? "";
    if (!ObjectId.isValid(id)) {
      return yield* Effect.fail(new ValidationError({ message: "Invalid experiment id" }));
    }
    const includeRawData = url.searchParams.get("includeRawData") === "true";
    const includeOriginalData = url.searchParams.get("includeOriginalData") === "true";

    const mongo = yield* Mongo;
    const collection = yield* mongo.collection(dbName, EXPERIMENTS);
    const projection = includeRawData ? {} : { data: 0, originalData: 0, metadata: 0 };
    const experiment = yield* attempt(
      () => collection.findOne({ _id: new ObjectId(id) }, { projection }),
      "experiments.findOne",
    ).pipe(Effect.flatMap(requireFound("Experiment", id)));

    if (includeRawData) {
      if (includeOriginalData && experiment.originalData) {
        experiment.rawdata = experiment.originalData;
        experiment.isOriginalData = true;
      } else if (experiment.data) {
        experiment.rawdata = experiment.data;
        experiment.isOriginalData = false;
      }
    }

    return yield* ok(experiment);
  });

export const GET = (request: Request) => runRoute(getExperiment(request));

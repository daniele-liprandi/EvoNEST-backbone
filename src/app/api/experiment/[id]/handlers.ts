import { Effect } from "effect";
import { ObjectId } from "mongodb";
import { ok, currentDatabase, Mongo, attempt, requireFound, ValidationError } from "@/lib/effect";

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

import { Effect, Schema } from "effect";
import { NextResponse } from "next/server";
import {
  runRoute,
  decodeSearchParams,
  currentDatabase,
  Mongo,
  ValidationError,
  NotFoundError,
} from "@/lib/effect";
import { exportExperimentsToStructuredFormat } from "@/utils/exporters/json-exporter";

const Params = Schema.Struct({
  format: Schema.optional(Schema.String),
  type: Schema.optional(Schema.String),
});

export const exportExperiments = (request: Request) =>
  Effect.gen(function* () {
    const { format, type } = yield* decodeSearchParams(Params)(request);
    if ((format ?? "json").toLowerCase() !== "json") {
      return yield* Effect.fail(
        new ValidationError({ message: "Only JSON export is supported; omit format or use format=json" }),
      );
    }

    const dbName = yield* currentDatabase;
    const mongo = yield* Mongo;
    const experiments = yield* mongo.find(dbName, "experiments", { type: type ?? "tensile_test" });
    if (experiments.length === 0) {
      return yield* Effect.fail(new NotFoundError({ resource: "Experiments" }));
    }

    const date = new Date().toISOString().split("T")[0];
    return new NextResponse(JSON.stringify(exportExperimentsToStructuredFormat(experiments), null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="tensile_tests_${date}.json"`,
      },
    });
  });

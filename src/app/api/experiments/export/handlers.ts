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

/**
 * @swagger
 * /api/experiments/export:
 *   get:
 *     summary: Download experiment data as JSON
 *     tags: [Experiments]
 *     parameters:
 *       - { in: query, name: format, schema: { type: string, default: json } }
 *       - { in: query, name: type, schema: { type: string, default: tensile_test } }
 *     responses:
 *       200: { description: JSON attachment }
 *       400: { description: Unsupported format }
 *       401: { description: Unauthorized }
 *       404: { description: No experiments found }
 */

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

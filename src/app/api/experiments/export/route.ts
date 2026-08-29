import { Effect, Schema } from "effect";
import { NextResponse } from "next/server";
import {
  runRoute,
  decodeSearchParams,
  Auth,
  Mongo,
  ValidationError,
  NotFoundError,
} from "@/lib/effect";
import { exportExperimentsToStructuredFormat } from "@/utils/exporters/json-exporter";

/**
 * @swagger
 * /api/experiments/export:
 *   get:
 *     summary: Export tensile test experimental data
 *     description: Export tensile test experiment data as a JSON download, session-authenticated
 *     tags:
 *       - Experiments
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           default: json
 *         description: Export format (only JSON supported)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           default: tensile_test
 *         description: Experiment type filter
 *     responses:
 *       200:
 *         description: Experiments exported successfully
 *       400:
 *         description: Unsupported format requested
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No experiments found
 *       500:
 *         description: Server error
 */

const Params = Schema.Struct({
  format: Schema.optional(Schema.String),
  type: Schema.optional(Schema.String),
});

export const exportExperiments = (request: Request) =>
  Effect.gen(function* () {
    const params = yield* decodeSearchParams(Params)(request);
    const format = (params.format ?? "json").toLowerCase();
    const type = params.type ?? "tensile_test";

    if (format !== "json") {
      return yield* Effect.fail(
        new ValidationError({ message: "Only JSON export is supported; omit format or use format=json" }),
      );
    }

    const dbName = yield* Effect.flatMap(Auth, (auth) => auth.databaseName);
    const experiments = yield* Effect.flatMap(Mongo, (mongo) =>
      mongo.find(dbName, "experiments", { type }),
    );

    if (experiments.length === 0) {
      return yield* Effect.fail(new NotFoundError({ resource: "Experiments" }));
    }

    const structured = exportExperimentsToStructuredFormat(experiments);
    const date = new Date().toISOString().split("T")[0];
    return new NextResponse(JSON.stringify(structured, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="tensile_tests_${date}.json"`,
      },
    });
  });

export const GET = (request: Request) => runRoute(exportExperiments(request));

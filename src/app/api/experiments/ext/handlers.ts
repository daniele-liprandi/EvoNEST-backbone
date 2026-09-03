import { Effect } from "effect";
import { NextResponse } from "next/server";
import type { Document } from "mongodb";

import { runRoute, Mongo, attempt, apiKeyAuth, NotFoundError, ValidationError } from "@/lib/effect";
import { sampleChain } from "@/app/api/utils/sampleChain";
import { exportExperimentsToStructuredFormat } from "@/utils/exporters/json-exporter";

export const exportExperiments = (request: Request) =>
  Effect.gen(function* () {
    const { database } = yield* apiKeyAuth(request);
    const params = new URL(request.url).searchParams;

    const format = params.get("format") ?? "json";
    if (format.toLowerCase() !== "json") {
      return yield* Effect.fail(new ValidationError({ message: "Only JSON export is supported" }));
    }

    const type = params.get("type");
    const includeRawData = params.get("includeRawData") === "true";
    const includeOriginalData = params.get("includeOriginalData") === "true";
    const includeRelated = params.get("includeRelated") === "true";

    const mongo = yield* Mongo;
    const collection = yield* mongo.collection(database, "experiments");

    // Projection: skip the heavy fields unless the caller asked for raw data.
    const projection = includeRawData ? {} : { rawdata: 0, originalData: 0 };
    const experiments: Document[] = yield* attempt(
      () => collection.find(type ? { type } : {}, { projection }).toArray(),
      "experiments.find",
    );
    if (experiments.length === 0) {
      return yield* Effect.fail(new NotFoundError({ resource: "Experiments" }));
    }

    if (includeRelated) {
      for (const experiment of experiments) {
        if (experiment.sampleId) {
          experiment.sampleChain = yield* sampleChain(database, experiment.sampleId);
          experiment.associatedTraits = yield* mongo.find(database, "traits", {
            sampleId: experiment.sampleId,
          });
        }
      }
    }

    if (includeRawData) {
      for (const experiment of experiments) {
        if (includeOriginalData && experiment.originalData) {
          experiment.data = experiment.originalData;
          experiment.isOriginalData = true;
        } else if (!experiment.data && experiment.rawdata) {
          experiment.data = experiment.rawdata;
          experiment.isOriginalData = false;
        }
      }
    }

    const structured = exportExperimentsToStructuredFormat(experiments) as {
      experiments: Record<string, Document>;
      metadata: Record<string, unknown>;
    };

    Object.keys(structured.experiments).forEach((expId, index) => {
      const original = experiments[index];
      if (includeRelated) {
        if (original.sampleChain) structured.experiments[expId].sampleChain = original.sampleChain;
        if (original.associatedTraits) {
          structured.experiments[expId].associatedTraits = original.associatedTraits;
        }
      }
      if (!includeRawData) delete structured.experiments[expId].rawData;
    });

    structured.metadata.database = database;
    structured.metadata.filters = { type: type ?? "all", includeRawData, includeOriginalData, includeRelated };

    const stamp = new Date().toISOString().slice(0, 10);
    return NextResponse.json(structured, {
      headers: { "Content-Disposition": `attachment; filename="experiments_${database}_${stamp}.json"` },
    });
  });

export const GET = (request: Request) => runRoute(exportExperiments(request));

import { Effect } from "effect";
import { NextResponse } from "next/server";

import { Mongo, apiKeyAuth, NotFoundError, ValidationError } from "@/lib/effect";
import { sampleChain } from "@/app/api/utils/sampleChain";

export const exportSamples = (request: Request) =>
  Effect.gen(function* () {
    const { database } = yield* apiKeyAuth(request);
    const params = new URL(request.url).searchParams;

    const format = params.get("format") ?? "json";
    if (format.toLowerCase() !== "json") {
      return yield* Effect.fail(new ValidationError({ message: "Only JSON export is supported" }));
    }

    const type = params.get("type");
    const includeRelated = params.get("includeRelated") === "true";

    const mongo = yield* Mongo;
    const samples = yield* mongo.find(database, "samples", type ? { type } : {});
    if (samples.length === 0) {
      return yield* Effect.fail(new NotFoundError({ resource: "Samples" }));
    }

    if (includeRelated) {
      for (const sample of samples) {
        if (sample.parentId) {
          sample.parentChain = yield* sampleChain(database, sample.parentId);
        }
      }
    }

    const stamp = new Date().toISOString().slice(0, 10);
    return NextResponse.json(
      {
        database,
        exportDate: new Date().toISOString(),
        totalSamples: samples.length,
        filters: { type: type ?? "all", includeRelated },
        samples,
      },
      { headers: { "Content-Disposition": `attachment; filename="samples_${database}_${stamp}.json"` } },
    );
  });

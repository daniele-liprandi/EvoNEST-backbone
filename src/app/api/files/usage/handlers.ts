import { Effect } from "effect";
import { ok, currentDatabase, Mongo, attempt } from "@/lib/effect";

/**
 * Storage footprint for the active NEST: bytes held in GridFS, how many files
 * are external links, and the total file count. Drives the settings meter.
 */
export const fileUsage = Effect.gen(function* () {
  const dbName = yield* currentDatabase;
  const mongo = yield* Mongo;
  const files = yield* mongo.collection(dbName, "files");

  const rows = yield* attempt(
    () =>
      files
        .aggregate([
          {
            $group: {
              _id: "$storage.backend",
              count: { $sum: 1 },
              bytes: { $sum: { $ifNull: ["$size", 0] } },
            },
          },
        ])
        .toArray(),
    "files.usage aggregate",
  );

  let gridfsBytes = 0;
  let externalCount = 0;
  let fileCount = 0;
  for (const row of rows) {
    fileCount += row.count;
    if (row._id === "gridfs") gridfsBytes = row.bytes;
    if (row._id === "external") externalCount = row.count;
  }

  return yield* ok({ gridfsBytes, externalCount, fileCount });
});

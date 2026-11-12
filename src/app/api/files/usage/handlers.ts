import { Effect } from "effect";
import { ok, currentDatabase, Mongo, attempt } from "@/lib/effect";
import { BUCKET_NAME } from "../gridfs";

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
            },
          },
        ])
        .toArray(),
    "files.usage aggregate",
  );

  // Bytes from the bucket itself: rows that share a deduplicated blob would
  // count it once per row.
  const blobs = yield* mongo.collection(dbName, `${BUCKET_NAME}.files`);
  const [stored] = yield* attempt(
    () => blobs.aggregate([{ $group: { _id: null, bytes: { $sum: "$length" } } }]).toArray(),
    "files.usage blob bytes",
  );
  const gridfsBytes = stored?.bytes ?? 0;

  let externalCount = 0;
  let fileCount = 0;
  for (const row of rows) {
    fileCount += row.count;
    if (row._id === "external") externalCount = row.count;
  }

  return yield* ok({ gridfsBytes, externalCount, fileCount });
});

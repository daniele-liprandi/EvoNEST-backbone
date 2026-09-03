import { Effect } from "effect";
import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat, unlink } from "fs/promises";
import { ObjectId } from "mongodb";
import mime from "mime-types";
import {
  ok,
  currentDatabase,
  Mongo,
  attempt,
  ValidationError,
  NotFoundError,
} from "@/lib/effect";

const isHexId = (v: string) => ObjectId.isValid(v) && new ObjectId(v).toHexString() === v;

export const streamFile = (fileId: string) =>
  Effect.gen(function* () {
    if (!isHexId(fileId)) return yield* Effect.fail(new ValidationError({ message: "Invalid file id" }));
    const dbName = yield* currentDatabase;
    const mongo = yield* Mongo;

    const fileDoc = yield* mongo.findOne(dbName, "files", { _id: new ObjectId(fileId) });
    if (!fileDoc) return yield* Effect.fail(new NotFoundError({ resource: "File" }));

    const stats = yield* attempt(() => stat(fileDoc.path), "fs.stat").pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    );
    if (!stats || !stats.isFile()) {
      return yield* Effect.fail(new NotFoundError({ resource: "File on the server" }));
    }

    const contentType = (mime.lookup(fileDoc.path) as string) || "application/octet-stream";
    const headers = new Headers({
      "content-type": contentType,
      "content-length": String(stats.size),
    });
    if (contentType.startsWith("image/")) {
      headers.set("cache-control", "public, max-age=31536000");
    }
    return new NextResponse(createReadStream(fileDoc.path) as unknown as BodyInit, { headers });
  });

export const deleteFile = (fileId: string) =>
  Effect.gen(function* () {
    if (!isHexId(fileId)) return yield* Effect.fail(new ValidationError({ message: "Invalid file id" }));
    const dbName = yield* currentDatabase;
    const mongo = yield* Mongo;
    const _id = new ObjectId(fileId);

    const fileDoc = yield* mongo.findOne(dbName, "files", { _id });
    if (!fileDoc) return yield* Effect.fail(new NotFoundError({ resource: "File", id: fileId }));

    const { entryType, entryId } = (fileDoc.metadata ?? {}) as { entryType?: string; entryId?: string };
    const collection = entryType === "sample" ? "samples" : "traits";

    // A missing file on disk must not block the database cleanup.
    yield* attempt(() => unlink(fileDoc.path), "fs.unlink").pipe(Effect.catchAll(() => Effect.void));
    yield* mongo.deleteOne(dbName, "files", { _id });

    if (entryId) {
      const now = new Date().toISOString();
      yield* mongo
        .updateOne(
          dbName,
          collection,
          { _id: new ObjectId(String(entryId)) },
          {
            $pull: { filesId: fileId },
            $set: { recentChangeDate: now },
            $push: { logbook: [now, `Deleted file ${fileDoc.name} from ${entryType} ${entryId}`] },
          },
        )
        .pipe(Effect.catchAll(() => Effect.void));
    }

    return yield* ok({ success: true });
  });

import { Effect } from "effect";
import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat, unlink } from "fs/promises";
import { Readable } from "stream";
import { ObjectId, type Document } from "mongodb";
import mime from "mime-types";
import {
  ok,
  currentDatabase,
  Mongo,
  attempt,
  ValidationError,
  NotFoundError,
} from "@/lib/effect";
import { resolveAttachmentTarget } from "@/shared/config/attachment-targets";
import { bucketFor, deleteBlobIfUnreferenced, parseRangeHeader } from "../gridfs";

const isHexId = (v: string) => ObjectId.isValid(v) && new ObjectId(v).toHexString() === v;

const toWebStream = (stream: Readable) =>
  Readable.toWeb(stream) as unknown as ReadableStream;

const contentTypeOf = (fileDoc: Document, fallbackName?: string) =>
  (typeof fileDoc.mime === "string" && fileDoc.mime) ||
  (typeof fileDoc.contentType === "string" && fileDoc.contentType) ||
  (fallbackName && (mime.lookup(fallbackName) as string)) ||
  "application/octet-stream";

/** Stream a GridFS-backed file, honouring a single `Range` request. */
const streamFromGridFS = (dbName: string, fileDoc: Document, request: Request) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    const db = yield* mongo.db(dbName);
    const bucket = bucketFor(db);
    const ref = fileDoc.storage.ref as ObjectId;
    const size = typeof fileDoc.size === "number" ? fileDoc.size : null;
    const contentType = contentTypeOf(fileDoc, fileDoc.name);
    const hash =
      (typeof fileDoc.sha256 === "string" && fileDoc.sha256) ||
      (typeof fileDoc.storage?.sha256 === "string" && fileDoc.storage.sha256) ||
      undefined;
    const etag = hash ? `"${hash}"` : undefined;

    if (etag && request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { etag } });
    }

    const headers: Record<string, string> = {
      "content-type": contentType,
      "accept-ranges": "bytes",
      // Content-addressed by sha256 — safe to cache hard.
      "cache-control": "public, max-age=31536000, immutable",
    };
    if (etag) headers.etag = etag;

    const range = size != null ? parseRangeHeader(request.headers.get("range"), size) : null;
    if (range === "unsatisfiable") {
      return new NextResponse("Range Not Satisfiable", {
        status: 416,
        headers: { "content-range": `bytes */${size}` },
      });
    }

    if (range && size != null) {
      // GridFS `end` is exclusive; the HTTP range end is inclusive.
      const stream = bucket.openDownloadStream(ref, { start: range.start, end: range.end + 1 });
      return new NextResponse(toWebStream(stream), {
        status: 206,
        headers: {
          ...headers,
          "content-range": `bytes ${range.start}-${range.end}/${size}`,
          "content-length": String(range.end - range.start + 1),
        },
      });
    }

    const stream = bucket.openDownloadStream(ref);
    return new NextResponse(toWebStream(stream), {
      headers: size != null ? { ...headers, "content-length": String(size) } : headers,
    });
  });

/** Legacy disk-backed file (pre-migration 022). Kept until the sweep removes them. */
const streamFromDisk = (fileDoc: Document) =>
  Effect.gen(function* () {
    const stats = yield* attempt(() => stat(fileDoc.path), "fs.stat").pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    );
    if (!stats || !stats.isFile()) {
      return yield* Effect.fail(new NotFoundError({ resource: "File on the server" }));
    }
    const contentType = contentTypeOf(fileDoc, fileDoc.path);
    const headers = new Headers({
      "content-type": contentType,
      "content-length": String(stats.size),
      "accept-ranges": "bytes",
    });
    if (contentType.startsWith("image/")) {
      headers.set("cache-control", "public, max-age=31536000");
    }
    return new NextResponse(createReadStream(fileDoc.path) as unknown as BodyInit, { headers });
  });

export const streamFile = (fileId: string, request: Request) =>
  Effect.gen(function* () {
    if (!isHexId(fileId))
      return yield* Effect.fail(new ValidationError({ message: "Invalid file id" }));
    const dbName = yield* currentDatabase;
    const mongo = yield* Mongo;

    const fileDoc = yield* mongo.findOne(dbName, "files", { _id: new ObjectId(fileId) });
    if (!fileDoc) return yield* Effect.fail(new NotFoundError({ resource: "File" }));

    if (fileDoc.storage?.backend === "gridfs") {
      return yield* streamFromGridFS(dbName, fileDoc, request);
    }
    return yield* streamFromDisk(fileDoc);
  });

export const deleteFile = (fileId: string) =>
  Effect.gen(function* () {
    if (!isHexId(fileId))
      return yield* Effect.fail(new ValidationError({ message: "Invalid file id" }));
    const dbName = yield* currentDatabase;
    const mongo = yield* Mongo;
    const _id = new ObjectId(fileId);

    const fileDoc = yield* mongo.findOne(dbName, "files", { _id });
    if (!fileDoc) return yield* Effect.fail(new NotFoundError({ resource: "File", id: fileId }));

    yield* mongo.deleteOne(dbName, "files", { _id });

    if (fileDoc.storage?.backend === "gridfs") {
      const db = yield* mongo.db(dbName);
      yield* Effect.promise(() => deleteBlobIfUnreferenced(db, fileDoc.storage.ref as ObjectId));
    } else if (typeof fileDoc.path === "string") {
      // A missing file on disk must not block the database cleanup.
      yield* attempt(() => unlink(fileDoc.path), "fs.unlink").pipe(Effect.catchAll(() => Effect.void));
    }

    const { entryType, entryId } = (fileDoc.metadata ?? {}) as {
      entryType?: string;
      entryId?: string;
    };
    const collection = resolveAttachmentTarget(entryType)?.collection ?? "traits";

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

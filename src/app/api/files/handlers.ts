import { Effect, Schema } from "effect";
import { basename } from "path";
import { stat, readFile } from "fs/promises";
import { createHash } from "crypto";
import { ObjectId, type Db, type Document } from "mongodb";
import mime from "mime-types";
import {
  ok,
  decodeBody,
  currentDatabase,
  currentUser,
  Mongo,
  attempt,
  requireCapability,
  ValidationError,
  NotFoundError,
  ConflictError,
  InternalError,
} from "@/lib/effect";
import { resolveAttachmentTarget, kindFromMime } from "@/shared/config/attachment-targets";
import { bucketFor, putBuffer, streamUploadToGridFS, UploadError } from "./gridfs";
import { resolveExternalPath } from "./external";

const isHexId = (v: string) => ObjectId.isValid(v) && new ObjectId(v).toHexString() === v;

const DEFAULT_PAGE = 50;
const MAX_PAGE = 200;

interface Metadata {
  entryType?: string;
  entryId?: string;
  deferredLink?: boolean;
  [key: string]: unknown;
}

/** Best-effort removal of an orphaned GridFS blob. */
const dropBlob = (db: Db, ref: ObjectId) =>
  Effect.promise(() => bucketFor(db).delete(ref).catch(() => {}));

/**
 * Append `fileId` to the target entry's `filesId` and write a logbook line.
 * Returns whether an entry was matched — demo data stores ids as strings or
 * ObjectIds, so both are tried.
 */
const linkEntry = (
  dbName: string,
  entryType: string,
  entryId: string,
  fileId: ObjectId,
  filename: string,
) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    const collection = resolveAttachmentTarget(entryType)?.collection ?? "experiments";
    const now = new Date().toISOString();
    const update = {
      $addToSet: { filesId: fileId.toString() },
      $set: { recentChangeDate: now },
      $push: { logbook: [now, `Uploaded file ${filename} with id ${fileId}`] },
    };

    let matched = (yield* mongo.updateOne(dbName, collection, { _id: entryId as never }, update))
      .matchedCount;
    if (matched === 0 && ObjectId.isValid(entryId)) {
      matched = (
        yield* mongo.updateOne(dbName, collection, { _id: new ObjectId(entryId) }, update)
      ).matchedCount;
    }
    return matched > 0;
  });

export const listFiles = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const mongo = yield* Mongo;
    const params = new URL(request.url).searchParams;

    const limit = Math.min(
      Math.max(Number(params.get("limit")) || DEFAULT_PAGE, 1),
      MAX_PAGE,
    );
    const cursor = params.get("cursor");
    const backend = params.get("backend");
    const kind = params.get("kind");

    const filter: Record<string, unknown> = {};
    if (backend) filter["storage.backend"] = backend;
    if (kind) filter.kind = kind;
    if (cursor && ObjectId.isValid(cursor)) filter._id = { $lt: new ObjectId(cursor) };

    // Newest first; `_id` descending doubles as the pagination key.
    const docs = yield* mongo.find(dbName, "files", filter, {
      sort: { _id: -1 },
      limit: limit + 1,
    });
    const files = docs.slice(0, limit);
    const nextCursor =
      docs.length > limit ? String(files[files.length - 1]._id) : null;

    return yield* ok({ files, nextCursor });
  });

export const uploadFile = (request: Request) =>
  Effect.gen(function* () {
    yield* requireCapability("files.upload");
    const dbName = yield* currentDatabase;
    const user = yield* currentUser;
    const mongo = yield* Mongo;
    const db = yield* mongo.db(dbName);

    // Stream the file straight into GridFS — no whole-file buffer — and hash it
    // in passing. Field parts (`metadata`, ...) come back alongside.
    const upload = yield* Effect.tryPromise({
      try: () => streamUploadToGridFS(request, db),
      catch: (e) =>
        e instanceof UploadError
          ? new ValidationError({ message: e.message })
          : new InternalError({ message: "Upload failed", cause: e }),
    });

    const metadata: Metadata = yield* Effect.try({
      try: () => JSON.parse(upload.fields.metadata || "{}") as Metadata,
      catch: () => new ValidationError({ message: "Invalid metadata JSON" }),
    });
    const { entryType, entryId, deferredLink } = metadata;

    if (!deferredLink && (!entryType || !entryId)) {
      yield* dropBlob(db, upload.ref);
      return yield* Effect.fail(
        new ValidationError({ message: "Missing entryType or entryId in metadata" }),
      );
    }

    // Content-addressed dedup: an identical blob is already stored, so drop this
    // upload and hand back the id that already points at it. The `{ sha256: 1 }`
    // unique index is the backstop for a race between the lookup and the insert.
    const reuse = (doc: Document) =>
      Effect.gen(function* () {
        yield* dropBlob(db, upload.ref);
        return doc._id as ObjectId;
      });

    const existing = yield* mongo.findOne(dbName, "files", { sha256: upload.sha256 });
    let fileId: ObjectId;
    let created = false;
    if (existing) {
      fileId = yield* reuse(existing);
    } else {
      const candidate = new ObjectId();
      const now = new Date();
      const inserted = yield* mongo
        .insertOne(dbName, "files", {
          _id: candidate,
          name: upload.filename,
          mime: upload.mime,
          // Mirrored under the old key so readers not yet moved off `contentType` keep working.
          contentType: upload.mime,
          kind: kindFromMime(upload.mime),
          size: upload.size,
          sha256: upload.sha256,
          storage: { backend: "gridfs", ref: upload.ref, sha256: upload.sha256 },
          createdAt: now,
          createdBy: user.doc?._id ?? user.sub,
          metadata: { ...metadata, uploadDate: now, isTemporary: !!deferredLink },
        })
        .pipe(Effect.either);

      if (inserted._tag === "Right") {
        fileId = candidate;
        created = true;
      } else {
        // Lost the race — another request stored this exact blob first.
        const winner = yield* mongo.findOne(dbName, "files", { sha256: upload.sha256 });
        if (!winner) return yield* Effect.fail(inserted.left);
        fileId = yield* reuse(winner);
      }
    }

    if (!deferredLink) {
      const linked = yield* linkEntry(
        dbName,
        entryType as string,
        entryId as string,
        fileId,
        upload.filename,
      );
      if (!linked) {
        // Only unwind a blob and a row this request actually created.
        if (created) {
          yield* dropBlob(db, upload.ref);
          yield* mongo
            .deleteOne(dbName, "files", { _id: fileId })
            .pipe(Effect.catchAll(() => Effect.void));
        }
        return yield* Effect.fail(new NotFoundError({ resource: entryType as string }));
      }
    }

    return yield* ok({ fileId: fileId.toString(), status: 200 });
  });

// --- External links -------------------------------------------------------

const FilesPostBody = Schema.Struct(
  {
    method: Schema.String,
    id: Schema.optional(Schema.String),
    path: Schema.optional(Schema.String),
    context: Schema.optional(Schema.String),
    mime: Schema.optional(Schema.String),
    name: Schema.optional(Schema.String),
  },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);
type FilesPostData = Schema.Schema.Type<typeof FilesPostBody>;

const requireExternalDoc = (dbName: string, id: string | undefined) =>
  Effect.gen(function* () {
    if (!id || !isHexId(id)) {
      return yield* Effect.fail(new ValidationError({ message: "Invalid file id" }));
    }
    const mongo = yield* Mongo;
    const fileDoc = yield* mongo.findOne(dbName, "files", { _id: new ObjectId(id) });
    if (!fileDoc) return yield* Effect.fail(new NotFoundError({ resource: "File" }));
    if (fileDoc.storage?.backend !== "external") {
      return yield* Effect.fail(new ValidationError({ message: "Not an external file" }));
    }
    return fileDoc;
  });

/** Register a file that stays where it lives — a NAS share, an instrument PC. */
const linkExternal = (data: FilesPostData) =>
  Effect.gen(function* () {
    yield* requireCapability("files.link-external");
    const dbName = yield* currentDatabase;
    const user = yield* currentUser;
    const mongo = yield* Mongo;

    const filePath = (data.path ?? "").trim();
    if (!filePath) return yield* Effect.fail(new ValidationError({ message: "path is required" }));

    const mimeType =
      (typeof data.mime === "string" && data.mime) ||
      (mime.lookup(filePath) as string) ||
      "application/octet-stream";
    const fileId = new ObjectId();
    const now = new Date();

    yield* mongo.insertOne(dbName, "files", {
      _id: fileId,
      name: (data.name ?? "").trim() || basename(filePath),
      mime: mimeType,
      contentType: mimeType,
      kind: kindFromMime(mimeType),
      storage: {
        backend: "external",
        path: filePath,
        ...(data.context ? { context: String(data.context) } : {}),
        lastCheckedStatus: "unknown",
      },
      createdAt: now,
      createdBy: user.doc?._id ?? user.sub,
      metadata: { uploadDate: now, isTemporary: false },
    });

    return yield* ok({ fileId: fileId.toString(), status: 200 });
  });

/** Stat one external path if the server can reach it. Never heals, never blocks. */
const checkExternal = (data: FilesPostData) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const mongo = yield* Mongo;
    const fileDoc = yield* requireExternalDoc(dbName, data.id);

    const abs = resolveExternalPath(fileDoc.storage.path);
    let status: "ok" | "missing" | "unknown" = "unknown";
    if (abs) {
      const stats = yield* attempt(() => stat(abs), "fs.stat").pipe(
        Effect.catchAll(() => Effect.succeed(null)),
      );
      status = stats && stats.isFile() ? "ok" : "missing";
    }

    const now = new Date();
    yield* mongo.updateOne(
      dbName,
      "files",
      { _id: fileDoc._id },
      { $set: { "storage.lastCheckedAt": now, "storage.lastCheckedStatus": status } },
    );
    return yield* ok({ status, checkedAt: now.toISOString() });
  });

/** Edit the path of an external file — every attachment that points at it follows. */
const setExternalPath = (data: FilesPostData) =>
  Effect.gen(function* () {
    yield* requireCapability("files.link-external");
    const dbName = yield* currentDatabase;
    const mongo = yield* Mongo;
    const fileDoc = yield* requireExternalDoc(dbName, data.id);

    const filePath = (data.path ?? "").trim();
    if (!filePath) return yield* Effect.fail(new ValidationError({ message: "path is required" }));

    yield* mongo.updateOne(
      dbName,
      "files",
      { _id: fileDoc._id },
      {
        $set: { "storage.path": filePath },
        $unset: { "storage.lastCheckedAt": "", "storage.lastCheckedStatus": "" },
      },
    );
    return yield* ok({ success: true });
  });

/** Pull an external file into GridFS once — stream, flip the record, keep the old path. */
const importExternal = (data: FilesPostData) =>
  Effect.gen(function* () {
    yield* requireCapability("files.upload");
    const dbName = yield* currentDatabase;
    const mongo = yield* Mongo;
    const db = yield* mongo.db(dbName);
    const fileDoc = yield* requireExternalDoc(dbName, data.id);

    const abs = resolveExternalPath(fileDoc.storage.path);
    if (!abs) {
      return yield* Effect.fail(
        new ConflictError({ message: "External file not reachable from the server" }),
      );
    }
    const buffer = yield* attempt(() => readFile(abs), "read external file").pipe(
      Effect.catchAll(() =>
        Effect.fail(new ConflictError({ message: "External file could not be read" })),
      ),
    );

    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const mimeType =
      (typeof fileDoc.mime === "string" && fileDoc.mime) ||
      (mime.lookup(abs) as string) ||
      "application/octet-stream";

    const existing = yield* mongo.findOne(dbName, "files", { sha256 });
    let ref: ObjectId;
    let canonical = false;
    if (existing?.storage?.backend === "gridfs") {
      ref = existing.storage.ref as ObjectId;
    } else {
      canonical = true;
      ref = yield* Effect.promise(() => putBuffer(db, fileDoc.name ?? "imported", buffer, mimeType));
    }

    const set: Record<string, unknown> = {
      mime: mimeType,
      contentType: mimeType,
      kind: kindFromMime(mimeType),
      size: buffer.length,
      storage: { backend: "gridfs", ref, sha256, importedFrom: fileDoc.storage.path },
    };
    if (canonical) set.sha256 = sha256;

    yield* mongo.updateOne(dbName, "files", { _id: fileDoc._id }, { $set: set });
    return yield* ok({ fileId: String(fileDoc._id), status: 200 });
  });

export const handleFilesPost = (request: Request) =>
  Effect.gen(function* () {
    const data = yield* decodeBody(FilesPostBody)(request);
    switch (data.method) {
      case "link-external":
        return yield* linkExternal(data);
      case "check":
        return yield* checkExternal(data);
      case "set-path":
        return yield* setExternalPath(data);
      case "import":
        return yield* importExternal(data);
      default:
        return yield* Effect.fail(
          new ValidationError({ message: `Unknown method: ${data.method}` }),
        );
    }
  });

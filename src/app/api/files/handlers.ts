import { Effect, Schema } from "effect";
import { basename } from "path";
import { stat } from "fs/promises";
import { createReadStream } from "fs";
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
import {
  ALLOWED_MIME_TYPES,
  bucketFor,
  deleteBlobIfUnreferenced,
  gridfsBlobExists,
  putStream,
  sizeCapForMime,
  streamUploadToGridFS,
  UploadError,
} from "./gridfs";
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
 * Any row already backed by a blob with these bytes. Every GridFS row carries
 * `storage.sha256`, so this still finds the blob after the row holding the
 * unique top-level `sha256` is deleted.
 */
const findStoredBlob = (dbName: string, sha256: string) =>
  Effect.flatMap(Mongo, (mongo) =>
    mongo.findOne(dbName, "files", { "storage.sha256": sha256, "storage.backend": "gridfs" }),
  );

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

    // Content-addressed dedup of the blob, not the row: every upload gets its
    // own `files` row (deleting one entry's file must not take another's), and
    // a repeat upload points that row at the blob already stored. The canonical
    // row owns the unique top-level `sha256`; duplicates carry it only under
    // `storage`, as migration 022 does. The unique index settles a race.
    const now = new Date();
    const row = (ref: ObjectId, canonical: boolean) => ({
      _id: new ObjectId(),
      name: upload.filename,
      mime: upload.mime,
      // Mirrored under the old key so readers not yet moved off `contentType` keep working.
      contentType: upload.mime,
      kind: kindFromMime(upload.mime),
      size: upload.size,
      ...(canonical ? { sha256: upload.sha256 } : {}),
      storage: { backend: "gridfs", ref, sha256: upload.sha256 },
      createdAt: now,
      createdBy: user.doc?._id ?? user.sub,
      metadata: { ...metadata, uploadDate: now, isTemporary: !!deferredLink },
    });

    // The row goes in before this request's blob is dropped: once it points at
    // the shared blob, a concurrent delete of the other row keeps that blob.
    // If the blob was already reclaimed, the row keeps this request's copy.
    const insertDuplicateOf = (sharedDoc: Document) =>
      Effect.gen(function* () {
        const sharedRef = sharedDoc.storage.ref as ObjectId;
        const doc = row(sharedRef, false);
        yield* mongo.insertOne(dbName, "files", doc);
        const stillThere = yield* Effect.promise(() => gridfsBlobExists(db, sharedRef));
        if (stillThere) {
          yield* dropBlob(db, upload.ref);
          return { fileId: doc._id, ownsBlob: false };
        }
        yield* mongo.updateOne(dbName, "files", { _id: doc._id }, { $set: { "storage.ref": upload.ref } });
        return { fileId: doc._id, ownsBlob: true };
      });

    const existing = yield* findStoredBlob(dbName, upload.sha256);
    // Whether this request's own blob backs the new row (so unwinding drops it).
    let ownsBlob = false;
    let fileId: ObjectId;
    if (existing) {
      ({ fileId, ownsBlob } = yield* insertDuplicateOf(existing));
    } else {
      const doc = row(upload.ref, true);
      const inserted = yield* mongo.insertOne(dbName, "files", doc).pipe(Effect.either);
      if (inserted._tag === "Right") {
        fileId = doc._id;
        ownsBlob = true;
      } else {
        // Lost the race to another request storing these exact bytes, or the
        // insert failed for another reason.
        const winner = yield* findStoredBlob(dbName, upload.sha256);
        if (!winner) {
          yield* dropBlob(db, upload.ref);
          return yield* Effect.fail(inserted.left);
        }
        ({ fileId, ownsBlob } = yield* insertDuplicateOf(winner));
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
        // The row is always this request's; the blob only when it was new.
        yield* mongo
          .deleteOne(dbName, "files", { _id: fileId })
          .pipe(Effect.catchAll(() => Effect.void));
        // A concurrent upload of the same bytes may already point at this blob.
        if (ownsBlob) yield* Effect.promise(() => deleteBlobIfUnreferenced(db, upload.ref));
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

    const claimed =
      (typeof data.mime === "string" && data.mime) ||
      (mime.lookup(filePath) as string) ||
      "";
    // An unlisted type (an .html on a share, a forged mime) is stored as opaque
    // bytes, so it is never served inline as markup.
    const mimeType = ALLOWED_MIME_TYPES.has(claimed) ? claimed : "application/octet-stream";
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
    yield* requireCapability("files.link-external");
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
    const mimeType =
      (typeof fileDoc.mime === "string" && fileDoc.mime) ||
      (mime.lookup(abs) as string) ||
      "application/octet-stream";
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return yield* Effect.fail(
        new ValidationError({ message: `${mimeType} files can only stay as external links` }),
      );
    }
    const stats = yield* attempt(() => stat(abs), "fs.stat").pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    );
    if (!stats || !stats.isFile()) {
      return yield* Effect.fail(new ConflictError({ message: "External file could not be read" }));
    }
    const cap = sizeCapForMime(mimeType);
    if (stats.size > cap) {
      return yield* Effect.fail(
        new ValidationError({
          message: `Too large to load into the NEST (limit ${Math.round(cap / (1024 * 1024))} MB); keep it as an external link`,
        }),
      );
    }

    const tooLarge = new ValidationError({
      message: `Too large to load into the NEST (limit ${Math.round(cap / (1024 * 1024))} MB); keep it as an external link`,
    });
    const stored = yield* Effect.tryPromise({
      try: () => putStream(db, fileDoc.name ?? "imported", createReadStream(abs), mimeType, cap),
      catch: (e) =>
        e instanceof UploadError && e.failure === "too-large"
          ? tooLarge
          : new ConflictError({ message: "External file could not be read" }),
    });
    const { sha256 } = stored;

    // Same blob model as uploads: reuse an identical stored blob and drop ours,
    // but only once this row points at it and the blob is confirmed still there.
    const existing = yield* findStoredBlob(dbName, sha256);
    let ref = stored.ref;
    const canonical = !existing;
    if (existing) ref = existing.storage.ref as ObjectId;

    const set: Record<string, unknown> = {
      mime: mimeType,
      contentType: mimeType,
      kind: kindFromMime(mimeType),
      size: stored.size,
      storage: { backend: "gridfs", ref, sha256, importedFrom: fileDoc.storage.path },
    };
    if (canonical) set.sha256 = sha256;

    const updated = yield* mongo
      .updateOne(dbName, "files", { _id: fileDoc._id }, { $set: set })
      .pipe(Effect.either);
    if (updated._tag === "Left") {
      // A concurrent import or upload of the same bytes took the unique sha256.
      const winner = canonical
        ? yield* mongo.findOne(dbName, "files", { sha256, "storage.backend": "gridfs" })
        : null;
      if (!winner) {
        if (canonical) yield* dropBlob(db, stored.ref);
        return yield* Effect.fail(updated.left);
      }
      delete set.sha256;
      ref = winner.storage.ref as ObjectId;
      set.storage = { ...(set.storage as object), ref };
      yield* mongo.updateOne(dbName, "files", { _id: fileDoc._id }, { $set: set });
    }
    if (ref !== stored.ref) {
      if (yield* Effect.promise(() => gridfsBlobExists(db, ref))) {
        yield* dropBlob(db, stored.ref);
      } else {
        yield* mongo.updateOne(dbName, "files", { _id: fileDoc._id }, { $set: { "storage.ref": stored.ref } });
      }
    }
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

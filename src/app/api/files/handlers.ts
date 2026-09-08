import { Effect } from "effect";
import { ObjectId, type Db, type Document } from "mongodb";
import {
  ok,
  currentDatabase,
  currentUser,
  Mongo,
  requireCapability,
  ValidationError,
  NotFoundError,
  InternalError,
} from "@/lib/effect";
import { resolveAttachmentTarget, kindFromMime } from "@/shared/config/attachment-targets";
import { bucketFor, streamUploadToGridFS, UploadError } from "./gridfs";

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

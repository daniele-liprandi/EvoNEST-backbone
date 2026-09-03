import { Effect } from "effect";
import path from "path";
import fs from "fs/promises";
import { ObjectId } from "mongodb";
import {
  ok,
  currentDatabase,
  Mongo,
  attempt,
  ValidationError,
  NotFoundError,
} from "@/lib/effect";
import { requireEnv } from "@/app/api/utils/env";

const STORAGE_PATH = requireEnv("STORAGE_PATH");
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
  "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

const sanitizeFilename = (filename: string) =>
  filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 255);

const entryCollectionName = (entryType: string) =>
  entryType === "sample" ? "samples" : entryType === "trait" ? "traits" : "experiments";

const ensureDirectoryExists = (dirPath: string) =>
  attempt(() => fs.access(dirPath), "fs.access").pipe(
    Effect.catchAll(() => attempt(() => fs.mkdir(dirPath, { recursive: true }), "fs.mkdir")),
  );

/** Undo a partial upload: remove the written file and its document, each best-effort. */
const rollbackUpload = (dbName: string, filePath: string, fileId: ObjectId) =>
  Effect.all(
    [
      attempt(() => fs.unlink(filePath), "rollback fs.unlink").pipe(
        Effect.catchAll((e) => Effect.sync(() => console.error("Upload rollback: file", e))),
      ),
      Effect.flatMap(Mongo, (m) => m.deleteOne(dbName, "files", { _id: fileId })).pipe(
        Effect.catchAll((e) => Effect.sync(() => console.error("Upload rollback: document", e))),
      ),
    ],
    { discard: true },
  );

export const listFiles = Effect.gen(function* () {
  const dbName = yield* currentDatabase;
  const mongo = yield* Mongo;
  return yield* ok(yield* mongo.find(dbName, "files"));
});

interface Metadata {
  entryType?: string;
  entryId?: string;
  deferredLink?: boolean;
  [key: string]: unknown;
}

export const uploadFile = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;

    const formData = yield* attempt(() => request.formData(), "request.formData");
    const file = formData.get("file");
    const rawType = formData.get("type");
    const metadataStr = formData.get("metadata");

    if (!file || typeof file === "string") {
      return yield* Effect.fail(new ValidationError({ message: "No files received." }));
    }
    if (typeof file.size !== "number" || file.size <= 0) {
      return yield* Effect.fail(new ValidationError({ message: "Invalid file payload." }));
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return yield* Effect.fail(
        new ValidationError({ message: "File too large. Maximum allowed size is 20 MB." }),
      );
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return yield* Effect.fail(
        new ValidationError({ message: `Unsupported file type: ${file.type || "unknown"}` }),
      );
    }

    const metadata: Metadata = yield* Effect.try({
      try: () => JSON.parse((typeof metadataStr === "string" && metadataStr) || "{}") as Metadata,
      catch: () => new ValidationError({ message: "Invalid metadata JSON" }),
    });
    const { entryType, entryId, deferredLink } = metadata;

    if (!deferredLink && (!entryType || !entryId)) {
      return yield* Effect.fail(
        new ValidationError({ message: "Missing entryType or entryId in metadata" }),
      );
    }

    const mongo = yield* Mongo;
    const fileId = new ObjectId();
    const filename = sanitizeFilename(file.name || "uploaded_file");
    const type = (typeof rawType === "string" && rawType.replaceAll(" ", "_")) || "unknown";

    const filePath = deferredLink
      ? path.join(STORAGE_PATH, dbName, type, "temp", fileId.toString(), filename)
      : path.join(STORAGE_PATH, dbName, type, entryType as string, entryId as string, filename);

    yield* ensureDirectoryExists(path.dirname(filePath));
    const buffer = Buffer.from(yield* attempt(() => file.arrayBuffer(), "file.arrayBuffer"));
    yield* attempt(() => fs.writeFile(filePath, buffer), "fs.writeFile");

    yield* mongo.insertOne(dbName, "files", {
      _id: fileId,
      name: filename,
      path: filePath,
      metadata: { ...metadata, uploadDate: new Date(), isTemporary: !!deferredLink },
    });

    if (!deferredLink) {
      const collection = entryCollectionName(entryType as string);
      const now = new Date().toISOString();
      const linkUpdate = {
        $addToSet: { filesId: fileId.toString() },
        $set: { recentChangeDate: now },
        $push: { logbook: [now, `Uploaded file ${filename} of type ${type} and id ${fileId}`] },
      };

      // Demo data stores entry ids as strings or ObjectIds — try the raw value,
      // then the ObjectId. A miss on both rolls the upload back.
      let matched = (yield* mongo.updateOne(dbName, collection, { _id: entryId as never }, linkUpdate))
        .matchedCount;
      if (matched === 0 && ObjectId.isValid(entryId as string)) {
        matched = (
          yield* mongo.updateOne(dbName, collection, { _id: new ObjectId(entryId as string) }, linkUpdate)
        ).matchedCount;
      }
      if (matched === 0) {
        yield* rollbackUpload(dbName, filePath, fileId);
        return yield* Effect.fail(new NotFoundError({ resource: entryType as string }));
      }
    }

    return yield* ok({ fileId: fileId.toString(), status: 200 });
  });

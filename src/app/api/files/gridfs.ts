import { createHash } from "crypto";
import { Readable } from "stream";
import Busboy from "busboy";
import { GridFSBucket, ObjectId, type Db } from "mongodb";
import { kindFromMime } from "@/shared/config/attachment-targets";

/** Managed bytes live in one GridFS bucket per NEST database. */
export const BUCKET_NAME = "files";
export const bucketFor = (db: Db) => new GridFSBucket(db, { bucketName: BUCKET_NAME });

/** Store a whole buffer as a GridFS blob (migration/import paths). */
export const putBuffer = (
  db: Db,
  filename: string,
  buffer: Buffer,
  mime: string,
): Promise<ObjectId> =>
  new Promise((resolve, reject) => {
    const stream = bucketFor(db).openUploadStream(filename, { metadata: { contentType: mime } });
    stream.on("error", reject);
    stream.on("finish", () => resolve(stream.id as ObjectId));
    stream.end(buffer);
  });

/** Whether a GridFS blob (`_id: ref`) has any chunks — a cheap existence probe. */
export const gridfsBlobExists = (db: Db, ref: ObjectId) =>
  db
    .collection(`${BUCKET_NAME}.files`)
    .findOne({ _id: ref }, { projection: { _id: 1 } })
    .then((doc) => doc != null);

/**
 * Delete a GridFS blob only once no `files` document still points at it.
 * Migration 022 dedups by content, so one blob can back several file rows;
 * call this *after* the row that referenced it is gone. Best-effort: an
 * orphaned blob is harmless, and a failed cleanup must not fail the delete.
 */
export const deleteBlobIfUnreferenced = async (db: Db, ref: ObjectId) => {
  try {
    const stillReferenced = await db
      .collection("files")
      .countDocuments({ "storage.ref": ref }, { limit: 1 });
    if (stillReferenced === 0) await bucketFor(db).delete(ref);
  } catch {
    // leave the blob; nothing downstream depends on it being gone
  }
};

const MB = 1024 * 1024;

// Per-kind upload ceilings. Lab video and instrument audio run large; anything
// that renders as an image, a table or a document stays small enough to keep the
// request cheap. Looked up by MIME prefix so a new `video/*` type needs no edit.
const SIZE_CAP_BY_KIND: Record<string, number> = {
  image: 20 * MB,
  data: 20 * MB,
  document: 20 * MB,
  video: 200 * MB,
  audio: 200 * MB,
};

export const sizeCapForMime = (mime: string) =>
  SIZE_CAP_BY_KIND[kindFromMime(mime)] ?? 20 * MB;

export const ALLOWED_MIME_TYPES = new Set([
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
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/mp4",
]);

export const sanitizeFilename = (filename: string) =>
  filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 255);

const normaliseMime = (raw: string | undefined) =>
  (raw || "").split(";")[0].trim().toLowerCase();

export type UploadFailure = "no-file" | "unsupported-type" | "too-large" | "bad-request";

export class UploadError extends Error {
  constructor(
    readonly failure: UploadFailure,
    message: string,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export interface UploadResult {
  /** The GridFS file `_id` — what `files.storage.ref` points at. */
  ref: ObjectId;
  sha256: string;
  size: number;
  mime: string;
  filename: string;
  /** Non-file multipart parts (`type`, `metadata`, ...). */
  fields: Record<string, string>;
}

/**
 * Parse a `multipart/form-data` request and pipe its single file part straight
 * into GridFS — no whole-file buffer — hashing the bytes as they pass. The MIME
 * allow-list and the per-kind size cap are enforced mid-stream; a violation
 * aborts the write and deletes whatever chunks already landed.
 *
 * Resolves once the upload stream has flushed and every field is in hand. The
 * caller still owns dedup (drop this blob on a `sha256` hit) and linking.
 */
export const streamUploadToGridFS = (request: Request, db: Db): Promise<UploadResult> =>
  new Promise((resolve, reject) => {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return reject(new UploadError("bad-request", "Expected multipart/form-data"));
    }
    if (!request.body) return reject(new UploadError("bad-request", "Empty request body"));

    const bucket = bucketFor(db);
    const bb = Busboy({ headers: { "content-type": contentType } });
    const fields: Record<string, string> = {};

    let settled = false;
    let fileSeen = false;
    let pendingUpload: ObjectId | null = null;
    /** Resolves when the file part has finished streaming into GridFS. */
    let filePromise: Promise<Omit<UploadResult, "fields">> = Promise.reject(
      new UploadError("no-file", "No files received."),
    );
    // A rejected promise with no attached handler is an unhandled rejection —
    // silence the default one; the real error surfaces through `fail`/`close`.
    filePromise.catch(() => {});

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      if (pendingUpload) bucket.delete(pendingUpload).catch(() => {});
      reject(err);
    };

    bb.on("field", (name, value) => {
      fields[name] = value;
    });

    bb.on("file", (_name, stream, info) => {
      if (fileSeen) {
        // One upload, one file part. Ignore extras rather than orphan a blob.
        stream.resume();
        return;
      }
      fileSeen = true;
      const mime = normaliseMime(info.mimeType);
      const filename = sanitizeFilename(info.filename || "uploaded_file");

      if (!ALLOWED_MIME_TYPES.has(mime)) {
        stream.resume();
        filePromise = Promise.reject(
          new UploadError("unsupported-type", `Unsupported file type: ${mime || "unknown"}`),
        );
        filePromise.catch(() => {});
        return;
      }

      const cap = sizeCapForMime(mime);
      const hash = createHash("sha256");
      // The `files` document holds the authoritative mime; keep a copy on the
      // bucket entry too (the driver's typings dropped the `contentType` option).
      const uploadStream = bucket.openUploadStream(filename, { metadata: { contentType: mime } });
      pendingUpload = uploadStream.id as ObjectId;
      let size = 0;
      let overCap = false;

      filePromise = new Promise((res, rej) => {
        stream.on("data", (chunk: Buffer) => {
          if (overCap) return;
          size += chunk.length;
          if (size > cap) {
            overCap = true;
            stream.unpipe(uploadStream);
            uploadStream.destroy();
            stream.resume();
            rej(
              new UploadError(
                "too-large",
                `File too large. Maximum for this file type is ${Math.round(cap / MB)} MB.`,
              ),
            );
            return;
          }
          hash.update(chunk);
        });
        stream.on("error", rej);
        uploadStream.on("error", rej);
        uploadStream.on("finish", () => {
          if (overCap) return;
          res({ ref: uploadStream.id as ObjectId, sha256: hash.digest("hex"), size, mime, filename });
        });
        stream.pipe(uploadStream);
      });
      filePromise.catch(() => {});
    });

    bb.on("error", fail);

    bb.on("close", () => {
      if (settled) return;
      if (!fileSeen) return fail(new UploadError("no-file", "No files received."));
      filePromise
        .then((file) => {
          if (settled) return;
          settled = true;
          resolve({ ...file, fields });
        })
        .catch(fail);
    });

    Readable.fromWeb(request.body as Parameters<typeof Readable.fromWeb>[0]).pipe(bb);
  });

export interface RangeSpec {
  start: number;
  end: number;
}

/**
 * Parse an HTTP `Range` header against a known size. Returns `null` when absent
 * (serve the whole thing), `"unsatisfiable"` for a syntactically valid but
 * out-of-bounds range (416), or a clamped `{ start, end }` (inclusive). Only a
 * single `bytes=` range is supported — enough for media scrubbing.
 */
export const parseRangeHeader = (
  header: string | null,
  size: number,
): RangeSpec | null | "unsatisfiable" => {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;

  let start: number;
  let end: number;
  if (rawStart === "") {
    const suffix = Number(rawEnd);
    if (suffix === 0) return "unsatisfiable";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return "unsatisfiable";
  }
  return { start, end };
};

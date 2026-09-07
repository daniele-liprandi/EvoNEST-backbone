import { Effect, Schema } from "effect";
import { ObjectId } from "mongodb";
import fs from "fs/promises";
import mime from "mime-types";
import {
  ok,
  decodeBody,
  currentDatabase,
  requireCapability,
  Mongo,
  ValidationError,
  NotFoundError,
  InternalError,
  attempt,
} from "@/lib/effect";
import {
  resolveAttachmentTarget,
  ATTACHMENT_KINDS,
  kindFromMime,
} from "@/shared/config/attachment-targets";

const ATTACHMENTS = "attachments";
const FILES = "files";

const stamp = () => new Date().toISOString();
const isHexId = (v: unknown): v is string =>
  typeof v === "string" && ObjectId.isValid(v) && new ObjectId(v).toHexString() === v;

/**
 * A target document by id. Demo data stores entry ids as strings or ObjectIds,
 * so try the raw value then the ObjectId — the same fallback the file handlers
 * use.
 */
const loadTarget = (dbName: string, collection: string, targetId: string) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    const raw = yield* mongo.findOne(dbName, collection, { _id: targetId as never });
    if (raw) return raw;
    if (ObjectId.isValid(targetId)) {
      return yield* mongo.findOne(dbName, collection, { _id: new ObjectId(targetId) });
    }
    return null;
  });

/** Confirm the responsible user exists in usersdb. */
const requireResponsible = (responsible: unknown) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    if (!isHexId(String(responsible))) {
      return yield* Effect.fail(new ValidationError({ message: "Responsible not found" }));
    }
    const user = yield* mongo.findOne("usersdb", "users", { _id: new ObjectId(String(responsible)) });
    if (!user) return yield* Effect.fail(new ValidationError({ message: "Responsible not found" }));
  });

// --- GET -------------------------------------------------------------------

export const listAttachments = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const params = new URL(request.url).searchParams;

    const filter: Record<string, unknown> = {};
    for (const key of ["targetType", "targetId", "kind", "category"] as const) {
      const value = params.get(key);
      if (value) filter[key] = value;
    }

    const mongo = yield* Mongo;
    const attachments = yield* mongo.find(dbName, ATTACHMENTS, filter, {
      sort: { order: 1, createdAt: 1 },
    });
    return yield* ok(attachments);
  });

// --- POST ----------------------------------------------------------------

const PostBody = Schema.Struct(
  {
    method: Schema.optional(Schema.String),
    id: Schema.optional(Schema.String),
    fileId: Schema.optional(Schema.String),
    targetType: Schema.optional(Schema.String),
    targetId: Schema.optional(Schema.String),
    category: Schema.optional(Schema.String),
    kind: Schema.optional(Schema.String),
    caption: Schema.optional(Schema.Unknown),
    stepKey: Schema.optional(Schema.Unknown),
    order: Schema.optional(Schema.Unknown),
    field: Schema.optional(Schema.String),
    value: Schema.optional(Schema.Unknown),
    responsible: Schema.optional(Schema.Unknown),
    date: Schema.optional(Schema.String),
    logbook: Schema.optional(Schema.Unknown),
  },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);
type PostData = Schema.Schema.Type<typeof PostBody>;

const asString = (v: unknown) => (typeof v === "string" ? v : null);

const createAttachment = (dbName: string, data: PostData) =>
  Effect.gen(function* () {
    const fileId = data.fileId ?? "";
    if (!isHexId(fileId)) {
      return yield* Effect.fail(new ValidationError({ message: "Invalid or missing fileId" }));
    }
    const targetType = (data.targetType ?? "").trim();
    const targetId = (data.targetId ?? "").trim();
    const category = (data.category ?? "").trim();
    if (!targetType || !targetId) {
      return yield* Effect.fail(
        new ValidationError({ message: "targetType and targetId are required" }),
      );
    }
    if (!category) {
      return yield* Effect.fail(new ValidationError({ message: "category is required" }));
    }

    const target = resolveAttachmentTarget(targetType);
    if (!target) {
      return yield* Effect.fail(new ValidationError({ message: `Unknown target type: ${targetType}` }));
    }

    yield* requireResponsible(data.responsible);

    const mongo = yield* Mongo;
    const fileDoc = yield* mongo.findOne(dbName, FILES, { _id: new ObjectId(fileId) });
    if (!fileDoc) return yield* Effect.fail(new NotFoundError({ resource: "File", id: fileId }));

    const targetDoc = yield* loadTarget(dbName, target.collection, targetId);
    if (!targetDoc) {
      return yield* Effect.fail(new NotFoundError({ resource: target.type, id: targetId }));
    }

    const now = stamp();
    const contentType =
      typeof fileDoc.contentType === "string" && fileDoc.contentType
        ? fileDoc.contentType
        : String(mime.lookup(String(fileDoc.path || fileDoc.name || "")) || "");
    // `kind` is the coarse filter key; `contentType` is the precise fact the UI
    // reads for finer render choices (a PDF embeds, a .docx only links).
    const kind =
      typeof data.kind === "string" && ATTACHMENT_KINDS.includes(data.kind)
        ? data.kind
        : kindFromMime(contentType);
    const caption = asString(data.caption);

    // The file was uploaded deferred (temporary); attaching it makes it permanent.
    yield* mongo.updateOne(
      dbName,
      FILES,
      { _id: fileDoc._id },
      { $set: { "metadata.isTemporary": false } },
    );

    const doc: Record<string, unknown> = {
      fileId: fileDoc._id,
      targetType,
      targetId,
      category,
      kind,
      contentType: contentType || null,
      caption,
      stepKey: asString(data.stepKey),
      order: typeof data.order === "number" ? data.order : null,
      responsible: data.responsible,
      date: asString(data.date) ?? now,
      createdAt: now,
      recentChangeDate: now,
      logbook: [[now, `Attached ${kind} (file ${fileId}) to ${targetType} ${targetId}`]],
    };

    const inserted = yield* mongo.insertOne(dbName, ATTACHMENTS, doc as never);
    if (!inserted.insertedId) {
      return yield* Effect.fail(new InternalError({ message: "Failed to create attachment" }));
    }

    // The target logbook stamp is best-effort: a target it can't update must not
    // fail the attachment creation.
    yield* mongo
      .updateOne(
        dbName,
        target.collection,
        { _id: targetDoc._id },
        {
          $set: { recentChangeDate: now },
          $push: { logbook: [now, `Attached ${kind} ${caption || fileId}`] },
        },
      )
      .pipe(Effect.catchAll(() => Effect.void));

    return yield* ok({ success: true, id: inserted.insertedId });
  });

const SETTABLE_FIELDS = new Set(["caption", "category", "stepKey", "order"]);

const setAttachmentField = (dbName: string, data: PostData) =>
  Effect.gen(function* () {
    if (!isHexId(data.id ?? "")) {
      return yield* Effect.fail(new ValidationError({ message: "Invalid attachment id" }));
    }
    const field = data.field ?? "";
    if (!SETTABLE_FIELDS.has(field)) {
      return yield* Effect.fail(new ValidationError({ message: `Field ${field} is not settable` }));
    }

    const mongo = yield* Mongo;
    const _id = new ObjectId(data.id as string);
    const attachment = yield* mongo.findOne(dbName, ATTACHMENTS, { _id });
    if (!attachment) {
      return yield* Effect.fail(new NotFoundError({ resource: "Attachment", id: data.id }));
    }

    const now = stamp();
    const result = yield* mongo.updateOne(
      dbName,
      ATTACHMENTS,
      { _id },
      {
        $set: { [field]: data.value, recentChangeDate: now },
        $push: { logbook: [now, `Set ${field} from ${attachment[field]} to ${data.value}`] },
      },
    );
    if (result.modifiedCount === 0) {
      return yield* Effect.fail(new NotFoundError({ resource: "Attachment", id: data.id }));
    }
    return yield* ok({ message: "Attachment updated successfully" });
  });

export const handleAttachmentPost = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const data = yield* decodeBody(PostBody)(request);

    switch (data.method) {
      case "create":
        return yield* createAttachment(dbName, data);
      case "setfield":
        return yield* setAttachmentField(dbName, data);
      default:
        return yield* Effect.fail(new ValidationError({ message: "Method not found" }));
    }
  });

// --- DELETE --------------------------------------------------------------

const DeleteBody = Schema.Struct({ id: Schema.String });

export const deleteAttachment = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    yield* requireCapability("attachments.delete");
    const { id } = yield* decodeBody(DeleteBody)(request);
    if (!isHexId(id)) {
      return yield* Effect.fail(new ValidationError({ message: "Invalid attachment id" }));
    }

    const mongo = yield* Mongo;
    const _id = new ObjectId(id);
    const attachment = yield* mongo.findOne(dbName, ATTACHMENTS, { _id });
    if (!attachment) return yield* Effect.fail(new NotFoundError({ resource: "Attachment", id }));

    const result = yield* mongo.deleteOne(dbName, ATTACHMENTS, { _id });
    if (result.deletedCount === 0) {
      return yield* Effect.fail(new InternalError({ message: "Failed to delete attachment" }));
    }

    // Drop the underlying file only when this was its last attachment.
    let fileDeleted = false;
    let fileDocDeleted = false;
    if (attachment.fileId) {
      const fileId = new ObjectId(String(attachment.fileId));
      const remaining = yield* mongo.find(dbName, ATTACHMENTS, { fileId });
      if (remaining.length === 0) {
        const fileDoc = yield* mongo.findOne(dbName, FILES, { _id: fileId });
        if (fileDoc) {
          yield* attempt(() => fs.unlink(fileDoc.path), "fs.unlink").pipe(
            Effect.catchAll(() => Effect.void),
          );
          const removed = yield* mongo.deleteOne(dbName, FILES, { _id: fileId });
          fileDocDeleted = removed.deletedCount > 0;
          fileDeleted = fileDocDeleted;
        }
      }
    }

    return yield* ok({ message: "Attachment deleted successfully", fileDeleted, fileDocDeleted });
  });

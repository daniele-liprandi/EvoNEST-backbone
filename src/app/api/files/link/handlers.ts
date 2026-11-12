import { Effect, Schema } from "effect";
import {
  ok,
  decodeBody,
  currentDatabase,
  Mongo,
  ObjectIdFromHex,
  NotFoundError,
} from "@/lib/effect";
import { resolveAttachmentTarget } from "@/shared/config/attachment-targets";

const Body = Schema.Struct({
  fileId: ObjectIdFromHex,
  entryType: Schema.String,
  entryId: ObjectIdFromHex,
});

export const linkFile = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const { fileId, entryType, entryId } = yield* decodeBody(Body)(request);
    const mongo = yield* Mongo;
    const collection = resolveAttachmentTarget(entryType)?.collection ?? "experiments";

    const fileDoc = yield* mongo.findOne(dbName, "files", { _id: fileId });
    if (!fileDoc) return yield* Effect.fail(new NotFoundError({ resource: "File" }));

    const entryDoc = yield* mongo.findOne(dbName, collection, { _id: entryId });
    if (!entryDoc) return yield* Effect.fail(new NotFoundError({ resource: "Entry" }));

    // GridFS files carry no path, so linking is a metadata flip — no move.
    if (fileDoc.metadata?.isTemporary) {
      yield* mongo.updateOne(
        dbName,
        "files",
        { _id: fileId },
        {
          $set: {
            "metadata.isTemporary": false,
            "metadata.entryType": entryType,
            "metadata.entryId": entryId.toHexString(),
          },
        },
      );
    }

    const now = new Date().toISOString();
    yield* mongo.updateOne(
      dbName,
      collection,
      { _id: entryId },
      {
        $addToSet: { filesId: fileId.toHexString() },
        $set: { recentChangeDate: now },
        $push: { logbook: [now, `Linked file ${fileDoc.name} (${fileId.toHexString()})`] },
      },
    );

    return yield* ok({ success: true });
  });

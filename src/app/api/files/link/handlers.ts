import { Effect, Schema } from "effect";
import path from "path";
import fs from "fs/promises";
import {
  ok,
  decodeBody,
  currentDatabase,
  Mongo,
  attempt,
  ObjectIdFromHex,
  NotFoundError,
} from "@/lib/effect";

const entryCollectionName = (entryType: string) =>
  entryType === "sample" ? "samples" : entryType === "trait" ? "traits" : "experiments";

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
    const collection = entryCollectionName(entryType);

    const fileDoc = yield* mongo.findOne(dbName, "files", { _id: fileId });
    if (!fileDoc) return yield* Effect.fail(new NotFoundError({ resource: "File" }));

    const entryDoc = yield* mongo.findOne(dbName, collection, { _id: entryId });
    if (!entryDoc) return yield* Effect.fail(new NotFoundError({ resource: "Entry" }));

    if (fileDoc.metadata?.isTemporary) {
      // Preserved from the pre-Effect route: two dirname() calls strip
      // `<fileId>/<name>` but not the `temp/` segment, so a linked file keeps a
      // `.../temp/<entryType>/<entryId>/<name>` path. Latent bug, not touched
      // here — behaviour is intentionally identical to the old route.
      const newPath = path.join(
        path.dirname(path.dirname(fileDoc.path)),
        entryType,
        entryId.toHexString(),
        path.basename(fileDoc.path),
      );
      yield* attempt(() => fs.mkdir(path.dirname(newPath), { recursive: true }), "fs.mkdir");
      yield* attempt(() => fs.rename(fileDoc.path, newPath), "fs.rename");

      yield* mongo.updateOne(
        dbName,
        "files",
        { _id: fileId },
        {
          $set: {
            path: newPath,
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

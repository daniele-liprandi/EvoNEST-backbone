import { Effect } from "effect";
import { ObjectId } from "mongodb";
import { ok, currentDatabase, Mongo, attempt, requireFound, ValidationError } from "@/lib/effect";

const ATTACHMENTS = "attachments";

export const getAttachment = (request: Request) =>
  Effect.gen(function* () {
    const dbName = yield* currentDatabase;
    const id = new URL(request.url).pathname.split("/").pop() ?? "";
    if (!ObjectId.isValid(id)) {
      return yield* Effect.fail(new ValidationError({ message: "Invalid attachment id" }));
    }

    const mongo = yield* Mongo;
    const collection = yield* mongo.collection(dbName, ATTACHMENTS);
    const attachment = yield* attempt(
      () => collection.findOne({ _id: new ObjectId(id) }),
      "attachments.findOne",
    ).pipe(Effect.flatMap(requireFound("Attachment", id)));

    return yield* ok(attachment);
  });

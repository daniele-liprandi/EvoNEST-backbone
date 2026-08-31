import { Effect } from "effect";
import { ObjectId, type Document } from "mongodb";
import { Mongo } from "@/lib/effect";

/** A sample's parent chain, from the sample itself up to the root. */
export const sampleChain = (dbName: string, startId: unknown) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    const chain: Document[] = [];
    let current: unknown = startId;
    while (current) {
      const id = current instanceof ObjectId ? current : new ObjectId(String(current));
      const doc = yield* mongo.findOne(dbName, "samples", { _id: id });
      if (!doc) break;
      chain.push(doc);
      current = doc.parentId;
    }
    return chain;
  });

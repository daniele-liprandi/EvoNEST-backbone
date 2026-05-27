import { NextResponse } from "next/server";
import { Collection } from "mongodb";

import { get_database_user } from "@/app/api/utils/get_database_user";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";

const EXCLUDE_FIELDS = new Set([
  "_id",
  "logbook",
  "recentChangeDate",
  "__v",
  "parentId",
  "responsible",
  "sampleId",
  "animalId",
  "fileId",
  "filesId",
  "data",
  "image",
]);

const COMPUTED = {
  samples: ["responsibleName", "parentName"],
  traits: ["responsibleName", "sampleName", "animalName"],
  experiments: ["responsibleName", "sampleName", "animalName"],
};

async function liveColumns(
  collection: Collection,
  filter: Record<string, unknown> = {}
): Promise<string[]> {
  const docs = await collection.find(filter).limit(30).toArray();
  const keys = new Set<string>();

  docs.forEach((doc) => {
    Object.keys(doc).forEach((key) => keys.add(key));
  });

  return Array.from(keys).filter((key) => !EXCLUDE_FIELDS.has(key));
}

export async function GET() {
  try {
    const dbName = await get_database_user();
    const client = await get_or_create_client();
    const db = client.db(dbName);

    const [sampleCols, traitCols, experimentCols] = await Promise.all([
      liveColumns(db.collection("samples")),
      liveColumns(db.collection("traits")),
      liveColumns(db.collection("experiments")),
    ]);

    const routes = [
      {
        label: "all samples",
        path: "/samples/general",
        columns: [...sampleCols, ...COMPUTED.samples],
      },
      {
        label: "animal samples",
        path: "/samples/animal",
        columns: [...sampleCols, ...COMPUTED.samples],
      },
      {
        label: "subsample samples",
        path: "/samples/subsample",
        columns: [...sampleCols, ...COMPUTED.samples],
      },
      {
        label: "silk samples",
        path: "/samples/silk",
        columns: [...sampleCols, ...COMPUTED.samples],
      },
      {
        label: "preserved samples",
        path: "/samples/preserved",
        columns: [...sampleCols, ...COMPUTED.samples],
      },
      {
        label: "plant samples",
        path: "/samples/plant",
        columns: [...sampleCols, ...COMPUTED.samples],
      },
      {
        label: "artificial samples",
        path: "/samples/artificial",
        columns: [...sampleCols, ...COMPUTED.samples],
      },
      {
        label: "traits measurements",
        path: "/traits",
        columns: [...traitCols, ...COMPUTED.traits],
      },
      {
        label: "general experiments",
        path: "/experiments/general",
        columns: [...experimentCols, ...COMPUTED.experiments],
      },
    ];

    return NextResponse.json({ routes });
  } catch (error: unknown) {
    console.error("schema error:", error);
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

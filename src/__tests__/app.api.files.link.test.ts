/** @jest-environment node */

import os from "os";

process.env.STORAGE_PATH = os.tmpdir();

import { Effect } from "effect";
import { ObjectId } from "mongodb";
import { runRoute } from "@/lib/effect";
import { setupTestMongo, type TestMongo } from "./helpers/mongo";
import { uploadFile } from "@/app/api/files/handlers";
import { linkFile } from "@/app/api/files/link/handlers";
import { streamFile, deleteFile } from "@/app/api/files/[fileId]/handlers";

jest.setTimeout(60_000);

let mongo: TestMongo;

beforeAll(async () => {
  mongo = await setupTestMongo();
});
afterAll(async () => {
  await mongo.stop();
});
beforeEach(async () => {
  await Promise.all(
    ["files", "files.files", "files.chunks", "samples", "traits"].map((c) =>
      mongo.db.collection(c).deleteMany({}),
    ),
  );
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const uploadDeferred = async (name = "photo.png", content = "hello") => {
  const form = new FormData();
  form.append("file", new File([content], name, { type: "image/png" }));
  form.append("metadata", JSON.stringify({ deferredLink: true }));
  const res = await runRoute(
    uploadFile(new Request("http://x/api/files", { method: "POST", body: form })).pipe(
      Effect.provide(mongo.layer),
    ),
  );
  return (await res.json()).fileId as string;
};

const link = (fileId: string, entryType: string, entryId: string) =>
  runRoute(
    linkFile(
      new Request("http://x/api/files/link", {
        method: "POST",
        body: JSON.stringify({ fileId, entryType, entryId }),
      }),
    ).pipe(Effect.provide(mongo.layer)),
  );

const seedSample = async () => {
  const _id = new ObjectId();
  await mongo.db.collection("samples").insertOne({ _id, name: "S", logbook: [] });
  return _id;
};

describe("POST /api/files/link", () => {
  test("flips the temp flag and links the entry — no filesystem move", async () => {
    const fileId = await uploadDeferred();
    const sampleId = await seedSample();

    const res = await link(fileId, "sample", sampleId.toHexString());
    expect(res.status).toBe(200);

    const after = await mongo.db.collection("files").findOne({ _id: new ObjectId(fileId) });
    expect(after!.metadata.isTemporary).toBe(false);
    expect(after!.metadata.entryType).toBe("sample");
    expect(after!.path).toBeUndefined();
    expect(after!.storage.backend).toBe("gridfs");

    const sample = await mongo.db.collection("samples").findOne({ _id: sampleId });
    expect(sample!.filesId).toContain(fileId);
  });

  test("resolves the entry collection from the target registry (trait -> traits)", async () => {
    const fileId = await uploadDeferred();
    const traitId = new ObjectId();
    await mongo.db.collection("traits").insertOne({ _id: traitId, quantity: "mass", logbook: [] });

    const res = await link(fileId, "trait", traitId.toHexString());
    expect(res.status).toBe(200);
    const trait = await mongo.db.collection("traits").findOne({ _id: traitId });
    expect(trait!.filesId).toContain(fileId);
  });

  test("404 when the file or the entry is missing", async () => {
    const sampleId = await seedSample();
    expect(
      (await link(new ObjectId().toHexString(), "sample", sampleId.toHexString())).status,
    ).toBe(404);

    const fileId = await uploadDeferred();
    expect((await link(fileId, "sample", new ObjectId().toHexString())).status).toBe(404);
  });

  test("400 for a malformed id", async () => {
    expect((await link("nope", "sample", "nope")).status).toBe(400);
  });
});

describe("/api/files/[fileId]", () => {
  test("GET streams the file with its content type and a long cache", async () => {
    const fileId = await uploadDeferred();
    const res = await runRoute(
      streamFile(fileId, new Request("http://x/f")).pipe(Effect.provide(mongo.layer)),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toMatch(/max-age=31536000/);
    expect(await res.text()).toBe("hello");
  });

  test("GET returns 304 when the ETag matches If-None-Match", async () => {
    const fileId = await uploadDeferred();
    const first = await runRoute(
      streamFile(fileId, new Request("http://x/f")).pipe(Effect.provide(mongo.layer)),
    );
    const etag = first.headers.get("etag")!;
    const res = await runRoute(
      streamFile(fileId, new Request("http://x/f", { headers: { "if-none-match": etag } })).pipe(
        Effect.provide(mongo.layer),
      ),
    );
    expect(res.status).toBe(304);
  });

  test("GET is 404 for a missing document, 400 for a bad id", async () => {
    expect(
      (
        await runRoute(
          streamFile(new ObjectId().toHexString(), new Request("http://x/f")).pipe(
            Effect.provide(mongo.layer),
          ),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await runRoute(
          streamFile("nope", new Request("http://x/f")).pipe(Effect.provide(mongo.layer)),
        )
      ).status,
    ).toBe(400);
  });

  test("DELETE keeps a GridFS blob that another file document still shares", async () => {
    // Migration 022 dedups by content, so two file docs can point at one blob.
    const primaryId = await uploadDeferred("primary.png", "shared bytes");
    const primary = await mongo.db.collection("files").findOne({ _id: new ObjectId(primaryId) });
    const sharerId = new ObjectId();
    await mongo.db.collection("files").insertOne({
      _id: sharerId,
      name: "sharer.png",
      storage: { backend: "gridfs", ref: primary!.storage.ref, sha256: primary!.sha256 },
    });

    await runRoute(deleteFile(sharerId.toHexString()).pipe(Effect.provide(mongo.layer)));
    expect(await mongo.db.collection("files.files").countDocuments()).toBe(1);

    await runRoute(deleteFile(primaryId).pipe(Effect.provide(mongo.layer)));
    expect(await mongo.db.collection("files.files").countDocuments()).toBe(0);
  });

  test("DELETE removes the blob, its document and unlinks the entry", async () => {
    const fileId = await uploadDeferred();
    const sampleId = await seedSample();
    await link(fileId, "sample", sampleId.toHexString());

    const res = await runRoute(deleteFile(fileId).pipe(Effect.provide(mongo.layer)));
    expect(res.status).toBe(200);
    expect(await mongo.db.collection("files").countDocuments()).toBe(0);
    expect(await mongo.db.collection("files.files").countDocuments()).toBe(0);
    expect(await mongo.db.collection("files.chunks").countDocuments()).toBe(0);

    const sample = await mongo.db.collection("samples").findOne({ _id: sampleId });
    expect(sample!.filesId ?? []).not.toContain(fileId);
  });
});

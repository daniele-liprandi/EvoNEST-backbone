/** @jest-environment node */

import os from "os";
import realFs from "fs";
import nodePath from "path";

const STORAGE_ROOT = realFs.mkdtempSync(nodePath.join(os.tmpdir(), "evonest-flink-"));
process.env.STORAGE_PATH = STORAGE_ROOT;

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
  realFs.rmSync(STORAGE_ROOT, { recursive: true, force: true });
});
beforeEach(async () => {
  await Promise.all(["files", "samples"].map((c) => mongo.db.collection(c).deleteMany({})));
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const uploadDeferred = async () => {
  const form = new FormData();
  form.append("file", new File(["hello"], "photo.png", { type: "image/png" }));
  form.append("type", "img");
  form.append("metadata", JSON.stringify({ deferredLink: true }));
  const res = await runRoute(
    uploadFile(new Request("http://x/api/files", { method: "POST", body: form })).pipe(Effect.provide(mongo.layer)),
  );
  return (await res.json()).fileId as string;
};

const seedSample = async () => {
  const _id = new ObjectId();
  await mongo.db.collection("samples").insertOne({ _id, name: "S", logbook: [] });
  return _id;
};

describe("POST /api/files/link", () => {
  test("moves a temp file into the entry directory and links it", async () => {
    const fileId = await uploadDeferred();
    const sampleId = await seedSample();
    const before = await mongo.db.collection("files").findOne({ _id: new ObjectId(fileId) });

    const res = await runRoute(
      linkFile(
        new Request("http://x/api/files/link", {
          method: "POST",
          body: JSON.stringify({ fileId, entryType: "sample", entryId: sampleId.toHexString() }),
        }),
      ).pipe(Effect.provide(mongo.layer)),
    );
    expect(res.status).toBe(200);

    const after = await mongo.db.collection("files").findOne({ _id: new ObjectId(fileId) });
    expect(after!.metadata.isTemporary).toBe(false);
    // NOTE: the old route leaves `temp/` in the linked path (latent bug,
    // preserved by the conversion) — see files/link/handlers.ts.
    expect(after!.path).toContain(`/img/temp/sample/${sampleId.toHexString()}/photo.png`);
    expect(realFs.existsSync(before!.path)).toBe(false);
    expect(realFs.existsSync(after!.path)).toBe(true);

    const sample = await mongo.db.collection("samples").findOne({ _id: sampleId });
    expect(sample!.filesId).toContain(fileId);
  });

  test("404 when the file or the entry is missing", async () => {
    const sampleId = await seedSample();
    const missingFile = await runRoute(
      linkFile(
        new Request("http://x/api/files/link", {
          method: "POST",
          body: JSON.stringify({ fileId: new ObjectId().toHexString(), entryType: "sample", entryId: sampleId.toHexString() }),
        }),
      ).pipe(Effect.provide(mongo.layer)),
    );
    expect(missingFile.status).toBe(404);

    const fileId = await uploadDeferred();
    const missingEntry = await runRoute(
      linkFile(
        new Request("http://x/api/files/link", {
          method: "POST",
          body: JSON.stringify({ fileId, entryType: "sample", entryId: new ObjectId().toHexString() }),
        }),
      ).pipe(Effect.provide(mongo.layer)),
    );
    expect(missingEntry.status).toBe(404);
  });

  test("400 for a malformed id", async () => {
    const res = await runRoute(
      linkFile(
        new Request("http://x/api/files/link", {
          method: "POST",
          body: JSON.stringify({ fileId: "nope", entryType: "sample", entryId: "nope" }),
        }),
      ).pipe(Effect.provide(mongo.layer)),
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/files/[fileId]", () => {
  test("GET streams the file with its content type", async () => {
    const fileId = await uploadDeferred();
    const res = await runRoute(streamFile(fileId).pipe(Effect.provide(mongo.layer)));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toMatch(/max-age=31536000/);
  });

  test("GET is 404 for a missing document, 400 for a bad id", async () => {
    expect((await runRoute(streamFile(new ObjectId().toHexString()).pipe(Effect.provide(mongo.layer)))).status).toBe(404);
    expect((await runRoute(streamFile("nope").pipe(Effect.provide(mongo.layer)))).status).toBe(400);
  });

  test("DELETE removes the file, its document and unlinks the entry", async () => {
    const fileId = await uploadDeferred();
    const sampleId = await seedSample();
    await runRoute(
      linkFile(
        new Request("http://x/api/files/link", {
          method: "POST",
          body: JSON.stringify({ fileId, entryType: "sample", entryId: sampleId.toHexString() }),
        }),
      ).pipe(Effect.provide(mongo.layer)),
    );
    const linked = await mongo.db.collection("files").findOne({ _id: new ObjectId(fileId) });

    const res = await runRoute(deleteFile(fileId).pipe(Effect.provide(mongo.layer)));
    expect(res.status).toBe(200);
    expect(await mongo.db.collection("files").countDocuments()).toBe(0);
    expect(realFs.existsSync(linked!.path)).toBe(false);
    const sample = await mongo.db.collection("samples").findOne({ _id: sampleId });
    expect(sample!.filesId ?? []).not.toContain(fileId);
  });
});

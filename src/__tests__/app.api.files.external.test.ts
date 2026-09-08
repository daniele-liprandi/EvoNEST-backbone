/** @jest-environment node */

import os from "os";
import realFs from "fs";
import nodePath from "path";

const ROOT = realFs.mkdtempSync(nodePath.join(os.tmpdir(), "evonest-ext-"));
process.env.STORAGE_PATH = os.tmpdir();
process.env.EXTERNAL_FILE_ROOTS = ROOT;

import { Effect, Layer } from "effect";
import { ObjectId } from "mongodb";
import { runRoute, mongoLayer, testAuth } from "@/lib/effect";
import { setupTestMongo, type TestMongo } from "./helpers/mongo";
import { handleFilesPost } from "@/app/api/files/handlers";
import { streamFile, deleteFile } from "@/app/api/files/[fileId]/handlers";

jest.setTimeout(60_000);

let mongo: TestMongo;

beforeAll(async () => {
  mongo = await setupTestMongo();
});
afterAll(async () => {
  await mongo.stop();
  realFs.rmSync(ROOT, { recursive: true, force: true });
});
beforeEach(async () => {
  await Promise.all(
    ["files", "files.files", "files.chunks"].map((c) => mongo.db.collection(c).deleteMany({})),
  );
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const post = (body: unknown, layer: typeof mongo.layer = mongo.layer) =>
  runRoute(
    handleFilesPost(
      new Request("http://x/api/files", { method: "POST", body: JSON.stringify(body) }),
    ).pipe(Effect.provide(layer)),
  );

const asRole = (role: string) =>
  Layer.merge(
    mongoLayer(mongo.client),
    testAuth({
      sub: "auth0|test",
      name: "T",
      activeDatabase: mongo.dbName,
      databases: [mongo.dbName],
      role,
    }),
  );

const writeExternal = (name: string, content = "external bytes") => {
  const p = nodePath.join(ROOT, name);
  realFs.writeFileSync(p, content);
  return p;
};

const linkExternal = async (filePath: string, extra: Record<string, unknown> = {}) => {
  const res = await post({ method: "link-external", path: filePath, ...extra });
  return { res, fileId: (await res.clone().json()).fileId as string };
};

describe("POST /api/files — external links", () => {
  test("link-external inserts an external file row, no bytes touched", async () => {
    const p = writeExternal("dataset.csv");
    const { res, fileId } = await linkExternal(p, { context: "instrument PC" });
    expect(res.status).toBe(200);

    const doc = await mongo.db.collection("files").findOne({ _id: new ObjectId(fileId) });
    expect(doc!.storage).toMatchObject({ backend: "external", path: p, context: "instrument PC" });
    expect(doc!.name).toBe("dataset.csv");
    expect(doc!.kind).toBe("data");
    expect(doc!.size).toBeUndefined();
    expect(await mongo.db.collection("files.files").countDocuments()).toBe(0);
  });

  test("link-external needs the files.link-external capability once an admin exists", async () => {
    await mongo.client.db("usersdb").collection("users").insertOne({ role: "admin", auth0id: "auth0|b" });
    const p = writeExternal("gated.csv");
    expect((await post({ method: "link-external", path: p }, asRole("viewer"))).status).toBe(403);
    expect((await post({ method: "link-external", path: p }, asRole("researcher"))).status).toBe(200);
    await mongo.client.db("usersdb").collection("users").deleteMany({ auth0id: "auth0|b" });
  });

  test("check records ok / missing / unknown without healing", async () => {
    const p = writeExternal("present.txt");
    const { fileId } = await linkExternal(p);

    const okRes = await post({ method: "check", id: fileId });
    expect((await okRes.json()).status).toBe("ok");
    let doc = await mongo.db.collection("files").findOne({ _id: new ObjectId(fileId) });
    expect(doc!.storage.lastCheckedStatus).toBe("ok");
    expect(doc!.storage.lastCheckedAt).toBeInstanceOf(Date);

    realFs.rmSync(p);
    expect((await (await post({ method: "check", id: fileId })).json()).status).toBe("missing");

    // A path outside every allowed root is "unknown" — the server can't reach it.
    const { fileId: outsideId } = await linkExternal("/etc/nowhere/secret.txt");
    expect((await (await post({ method: "check", id: outsideId })).json()).status).toBe("unknown");
  });

  test("set-path re-points the link and clears the last check", async () => {
    const p1 = writeExternal("v1.txt");
    const p2 = writeExternal("v2.txt");
    const { fileId } = await linkExternal(p1);
    await post({ method: "check", id: fileId });

    expect((await post({ method: "set-path", id: fileId, path: p2 })).status).toBe(200);
    const doc = await mongo.db.collection("files").findOne({ _id: new ObjectId(fileId) });
    expect(doc!.storage.path).toBe(p2);
    expect(doc!.storage.lastCheckedStatus).toBeUndefined();
  });

  test("import streams the external file into GridFS and flips the record", async () => {
    const p = writeExternal("to-import.csv", "a,b\n1,2\n");
    const { fileId } = await linkExternal(p);

    const res = await post({ method: "import", id: fileId });
    expect(res.status).toBe(200);

    const doc = await mongo.db.collection("files").findOne({ _id: new ObjectId(fileId) });
    expect(doc!.storage.backend).toBe("gridfs");
    expect(doc!.storage.importedFrom).toBe(p);
    expect(doc!.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(doc!.size).toBe(8);
    expect(await mongo.db.collection("files.files").countDocuments()).toBe(1);

    const streamed = await runRoute(
      streamFile(fileId, new Request("http://x/f")).pipe(Effect.provide(mongo.layer)),
    );
    expect(await streamed.text()).toBe("a,b\n1,2\n");
  });

  test("streaming a reachable external file honours a Range request", async () => {
    const { fileId } = await linkExternal(writeExternal("clip.txt", "0123456789"));
    const res = await runRoute(
      streamFile(
        fileId,
        new Request("http://x/f", { headers: { range: "bytes=2-5" } }),
      ).pipe(Effect.provide(mongo.layer)),
    );
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(await res.text()).toBe("2345");
  });

  test("check needs the files.link-external capability once an admin exists", async () => {
    const { fileId } = await linkExternal(writeExternal("gate-check.txt"));
    await mongo.client.db("usersdb").collection("users").insertOne({ role: "admin", auth0id: "auth0|c" });
    expect((await post({ method: "check", id: fileId }, asRole("viewer"))).status).toBe(403);
    expect((await post({ method: "check", id: fileId }, asRole("researcher"))).status).toBe(200);
    await mongo.client.db("usersdb").collection("users").deleteMany({ auth0id: "auth0|c" });
  });

  test("import of an unreachable path is 409", async () => {
    const { fileId } = await linkExternal("/etc/nowhere/x.bin");
    expect((await post({ method: "import", id: fileId })).status).toBe(409);
  });

  test("streaming an unreachable external file is 409", async () => {
    const { fileId } = await linkExternal("/etc/nowhere/x.bin");
    const res = await runRoute(
      streamFile(fileId, new Request("http://x/f")).pipe(Effect.provide(mongo.layer)),
    );
    expect(res.status).toBe(409);
  });

  test("DELETE drops the row but never unlinks the external file", async () => {
    const p = writeExternal("keep-on-disk.txt");
    const { fileId } = await linkExternal(p);

    const res = await runRoute(deleteFile(fileId).pipe(Effect.provide(mongo.layer)));
    expect(res.status).toBe(200);
    expect(await mongo.db.collection("files").countDocuments()).toBe(0);
    expect(realFs.existsSync(p)).toBe(true);
  });

  test("unknown method is 400", async () => {
    expect((await post({ method: "frobnicate" })).status).toBe(400);
  });
});

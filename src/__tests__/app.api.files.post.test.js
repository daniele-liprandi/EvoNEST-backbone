/** @jest-environment node */

const os = require("os");
const realFs = require("fs");
const nodePath = require("path");

const STORAGE_ROOT = realFs.mkdtempSync(nodePath.join(os.tmpdir(), "evonest-files-"));
process.env.STORAGE_PATH = STORAGE_ROOT;

const { Effect } = require("effect");
const { ObjectId } = require("mongodb");
const { runRoute } = require("@/lib/effect");
const { setupTestMongo } = require("./helpers/mongo");
const { uploadFile, listFiles } = require("@/app/api/files/handlers");

jest.setTimeout(60_000);

let mongo;
let responsible;

beforeAll(async () => {
  mongo = await setupTestMongo();
  responsible = await mongo.seedUser();
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

const upload = (parts) => {
  const form = new FormData();
  for (const [k, v] of Object.entries(parts)) form.append(k, v);
  return runRoute(
    uploadFile(new Request("http://x/api/files", { method: "POST", body: form })).pipe(
      Effect.provide(mongo.layer),
    ),
  );
};

const makeSample = async () => {
  const _id = new ObjectId();
  await mongo.db.collection("samples").insertOne({ _id, name: "S1", logbook: [], responsible });
  return _id;
};

const textFile = (name = "notes.txt") => new File(["col1,col2\n1,2\n"], name, { type: "text/plain" });

describe("POST /api/files", () => {
  test("uploads a file, writes it under the storage root and links the entry", async () => {
    const sampleId = await makeSample();
    const res = await upload({
      file: textFile(),
      type: "documents",
      metadata: JSON.stringify({ entryType: "sample", entryId: sampleId.toHexString() }),
    });
    expect(res.status).toBe(200);
    const { fileId } = await res.json();

    const doc = await mongo.db.collection("files").findOne({ _id: new ObjectId(fileId) });
    expect(doc.path).toContain(`${STORAGE_ROOT}/testdb/documents/sample/${sampleId.toHexString()}/notes.txt`);
    expect(realFs.readFileSync(doc.path, "utf8")).toContain("col1,col2");
    expect(doc.metadata.isTemporary).toBe(false);

    const sample = await mongo.db.collection("samples").findOne({ _id: sampleId });
    expect(sample.filesId).toContain(fileId);
    expect(sample.logbook.at(-1)[1]).toMatch(/Uploaded file notes.txt/);
  });

  test("a deferred upload lands in temp/ and is not linked", async () => {
    const res = await upload({ file: textFile(), type: "img", metadata: JSON.stringify({ deferredLink: true }) });
    expect(res.status).toBe(200);
    const { fileId } = await res.json();
    const doc = await mongo.db.collection("files").findOne({ _id: new ObjectId(fileId) });
    expect(doc.path).toContain(`/img/temp/${fileId}/notes.txt`);
    expect(doc.metadata.isTemporary).toBe(true);
  });

  test("missing file is 400 and writes nothing", async () => {
    const res = await upload({ type: "x", metadata: "{}" });
    expect(res.status).toBe(400);
    expect(await mongo.db.collection("files").countDocuments()).toBe(0);
  });

  test("an unsupported mime type is 400", async () => {
    const res = await upload({
      file: new File(["x"], "a.bin", { type: "application/octet-stream" }),
      metadata: JSON.stringify({ deferredLink: true }),
    });
    expect(res.status).toBe(400);
  });

  test("invalid metadata JSON is 400", async () => {
    const res = await upload({ file: textFile(), metadata: "{not json" });
    expect(res.status).toBe(400);
  });

  test("linking to a missing entry is 404 and rolls the upload back", async () => {
    const res = await upload({
      file: textFile(),
      type: "documents",
      metadata: JSON.stringify({ entryType: "sample", entryId: new ObjectId().toHexString() }),
    });
    expect(res.status).toBe(404);
    expect(await mongo.db.collection("files").countDocuments()).toBe(0);
  });
});

describe("GET /api/files", () => {
  test("lists the file documents", async () => {
    await mongo.db.collection("files").insertOne({ _id: new ObjectId(), name: "a", path: "/x" });
    const res = await runRoute(listFiles.pipe(Effect.provide(mongo.layer)));
    expect((await res.json())).toHaveLength(1);
  });
});

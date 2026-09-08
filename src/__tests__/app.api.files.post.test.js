/** @jest-environment node */

// STORAGE_PATH is still read at module load by the download handler; the files
// handler no longer touches disk.
process.env.STORAGE_PATH = require("os").tmpdir();

const { Effect } = require("effect");
const { ObjectId, GridFSBucket } = require("mongodb");
const { runRoute } = require("@/lib/effect");
const { setupTestMongo } = require("./helpers/mongo");
const { uploadFile, listFiles } = require("@/app/api/files/handlers");
const { streamFile } = require("@/app/api/files/[fileId]/handlers");

jest.setTimeout(60_000);

let mongo;
let responsible;

beforeAll(async () => {
  mongo = await setupTestMongo();
  responsible = await mongo.seedUser();
});
afterAll(async () => {
  await mongo.stop();
});
beforeEach(async () => {
  await Promise.all(
    ["files", "files.files", "files.chunks", "samples"].map((c) =>
      mongo.db.collection(c).deleteMany({}),
    ),
  );
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

const csvFile = (name = "notes.csv") =>
  new File(["col1,col2\n1,2\n"], name, { type: "text/csv" });

const blobCount = () => mongo.db.collection("files.files").countDocuments();

describe("POST /api/files — GridFS", () => {
  test("streams the upload into GridFS and links the entry", async () => {
    const sampleId = await makeSample();
    const res = await upload({
      file: csvFile(),
      metadata: JSON.stringify({ entryType: "sample", entryId: sampleId.toHexString() }),
    });
    expect(res.status).toBe(200);
    const { fileId } = await res.json();

    const doc = await mongo.db.collection("files").findOne({ _id: new ObjectId(fileId) });
    expect(doc.storage.backend).toBe("gridfs");
    expect(doc.storage.ref).toBeInstanceOf(ObjectId);
    expect(doc.kind).toBe("data");
    expect(doc.size).toBe(14);
    expect(doc.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await blobCount()).toBe(1);

    const sample = await mongo.db.collection("samples").findOne({ _id: sampleId });
    expect(sample.filesId).toContain(fileId);
  });

  test("a repeated upload dedups to one blob and returns the first id", async () => {
    const s1 = await makeSample();
    const s2 = await makeSample();
    const first = await (await upload({
      file: csvFile("a.csv"),
      metadata: JSON.stringify({ entryType: "sample", entryId: s1.toHexString() }),
    })).json();
    const second = await (await upload({
      file: csvFile("b.csv"),
      metadata: JSON.stringify({ entryType: "sample", entryId: s2.toHexString() }),
    })).json();

    expect(second.fileId).toBe(first.fileId);
    expect(await blobCount()).toBe(1);
    expect(await mongo.db.collection("files").countDocuments()).toBe(1);
  });

  test("accepts a video/* upload with the larger cap", async () => {
    const res = await upload({
      file: new File(["fake mp4 bytes"], "clip.mp4", { type: "video/mp4" }),
      metadata: JSON.stringify({ deferredLink: true }),
    });
    expect(res.status).toBe(200);
    const { fileId } = await res.json();
    const doc = await mongo.db.collection("files").findOne({ _id: new ObjectId(fileId) });
    expect(doc.kind).toBe("video");
  });

  test("rejects a file over its per-kind size cap and leaves no blob", async () => {
    const big = new File([new Uint8Array(21 * 1024 * 1024)], "big.png", { type: "image/png" });
    const res = await upload({ file: big, metadata: JSON.stringify({ deferredLink: true }) });
    expect(res.status).toBe(400);
    expect(await blobCount()).toBe(0);
    expect(await mongo.db.collection("files").countDocuments()).toBe(0);
  });

  test("rejects an unsupported MIME type", async () => {
    const res = await upload({
      file: new File(["x"], "a.bin", { type: "application/octet-stream" }),
      metadata: JSON.stringify({ deferredLink: true }),
    });
    expect(res.status).toBe(400);
  });

  test("missing entryType/entryId (non-deferred) is 400 and drops the blob", async () => {
    const res = await upload({ file: csvFile(), metadata: JSON.stringify({}) });
    expect(res.status).toBe(400);
    expect(await blobCount()).toBe(0);
  });

  test("invalid metadata JSON is 400", async () => {
    const res = await upload({ file: csvFile(), metadata: "{not json" });
    expect(res.status).toBe(400);
  });

  test("linking to a missing entry is 404 and rolls the upload back", async () => {
    const res = await upload({
      file: csvFile(),
      metadata: JSON.stringify({ entryType: "sample", entryId: new ObjectId().toHexString() }),
    });
    expect(res.status).toBe(404);
    expect(await mongo.db.collection("files").countDocuments()).toBe(0);
    expect(await blobCount()).toBe(0);
  });

  test("round-trips through the stream endpoint with a Range request", async () => {
    const { fileId } = await (await upload({
      file: csvFile(),
      metadata: JSON.stringify({ deferredLink: true }),
    })).json();

    const whole = await runRoute(
      streamFile(fileId, new Request("http://x/f")).pipe(Effect.provide(mongo.layer)),
    );
    expect(whole.status).toBe(200);
    expect(whole.headers.get("accept-ranges")).toBe("bytes");
    expect(whole.headers.get("etag")).toMatch(/^"[0-9a-f]{64}"$/);
    expect(await whole.text()).toBe("col1,col2\n1,2\n");

    const partial = await runRoute(
      streamFile(
        fileId,
        new Request("http://x/f", { headers: { range: "bytes=0-3" } }),
      ).pipe(Effect.provide(mongo.layer)),
    );
    expect(partial.status).toBe(206);
    expect(partial.headers.get("content-range")).toBe("bytes 0-3/14");
    expect(partial.headers.get("content-length")).toBe("4");
    expect(await partial.text()).toBe("col1");
  });
});

describe("GET /api/files", () => {
  const list = (qs = "") =>
    runRoute(
      listFiles(new Request(`http://x/api/files${qs}`)).pipe(Effect.provide(mongo.layer)),
    );

  test("paginates newest-first with a cursor", async () => {
    for (let i = 0; i < 3; i++) {
      await mongo.db.collection("files").insertOne({
        _id: new ObjectId(),
        name: `f${i}`,
        kind: "data",
        storage: { backend: "gridfs", ref: new ObjectId() },
      });
    }
    const page1 = await (await list("?limit=2")).json();
    expect(page1.files).toHaveLength(2);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = await (await list(`?limit=2&cursor=${page1.nextCursor}`)).json();
    expect(page2.files).toHaveLength(1);
    expect(page2.nextCursor).toBeNull();
  });

  test("filters by backend and kind", async () => {
    await mongo.db.collection("files").insertMany([
      { _id: new ObjectId(), name: "g", kind: "image", storage: { backend: "gridfs", ref: new ObjectId() } },
      { _id: new ObjectId(), name: "e", kind: "data", storage: { backend: "external", path: "/x" } },
    ]);
    const gridfs = await (await list("?backend=gridfs")).json();
    expect(gridfs.files.map((f) => f.name)).toEqual(["g"]);
    const data = await (await list("?kind=data")).json();
    expect(data.files.map((f) => f.name)).toEqual(["e"]);
  });
});

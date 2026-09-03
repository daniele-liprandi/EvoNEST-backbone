/** @jest-environment node */

const os = require("os");
const realFs = require("fs");
const nodePath = require("path");

const STORAGE_ROOT = realFs.mkdtempSync(nodePath.join(os.tmpdir(), "evonest-storage-"));
process.env.STORAGE_PATH = STORAGE_ROOT;

const { Effect, Layer } = require("effect");
const { runRoute, testMongo, testAuth } = require("@/lib/effect");
const { downloadFile } = require("@/app/api/download/handlers");

const VALID_ID = "507f1f77bcf86cd799439011";

const layerFor = (doc) =>
  Layer.merge(
    testMongo({ findOne: () => Effect.succeed(doc) }),
    testAuth({ sub: "u1", activeDatabase: "testdb" }),
  );

const run = (doc, id = VALID_ID) =>
  runRoute(downloadFile(new Request(`http://localhost/api/download?id=${id}`)).pipe(Effect.provide(layerFor(doc))));

afterAll(() => realFs.rmSync(STORAGE_ROOT, { recursive: true, force: true }));
beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("GET /api/download path containment", () => {
  test("serves a file inside the storage root", async () => {
    const filePath = nodePath.join(STORAGE_ROOT, "testdb", "animal", "sample", "1", "data.csv");
    realFs.mkdirSync(nodePath.dirname(filePath), { recursive: true });
    realFs.writeFileSync(filePath, "col1,col2\n1,2\n");

    const res = await run({ _id: VALID_ID, name: "data.csv", path: filePath });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("col1,col2");
  });

  test.each([
    ["absolute path outside root", "/etc/passwd"],
    ["traversal out of root", `${STORAGE_ROOT}/../etc/passwd`],
    ["sibling directory sharing a prefix", `${STORAGE_ROOT}-other/secret`],
  ])("rejects %s with 403", async (_label, badPath) => {
    const res = await run({ _id: VALID_ID, name: "x", path: badPath });
    expect(res.status).toBe(403);
  });

  test("rejects a non-string path", async () => {
    const res = await run({ _id: VALID_ID, name: "x", path: null });
    expect(res.status).toBe(403);
  });

  test("404 when the file document is missing", async () => {
    const res = await run(null);
    expect(res.status).toBe(404);
  });

  test("400 for a missing or malformed id", async () => {
    expect((await run({}, "")).status).toBe(400);
    expect((await run({}, "not-an-id")).status).toBe(400);
  });
});

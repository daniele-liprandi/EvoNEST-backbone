/** @jest-environment node */

import os from "os";

process.env.STORAGE_PATH = os.tmpdir();

import { Effect } from "effect";
import { ObjectId } from "mongodb";
import { runRoute } from "@/lib/effect";
import { setupTestMongo, type TestMongo } from "./helpers/mongo";
import { fileUsage } from "@/app/api/files/usage/handlers";

jest.setTimeout(60_000);

let mongo: TestMongo;

beforeAll(async () => {
  mongo = await setupTestMongo();
});
afterAll(async () => {
  await mongo.stop();
});
beforeEach(async () => {
  await mongo.db.collection("files").deleteMany({});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const usage = () => runRoute(fileUsage.pipe(Effect.provide(mongo.layer)));

const gridfsFile = (size: number) => ({
  _id: new ObjectId(),
  name: "g",
  size,
  storage: { backend: "gridfs", ref: new ObjectId() },
});
const externalFile = () => ({
  _id: new ObjectId(),
  name: "e",
  storage: { backend: "external", path: "/mnt/x" },
});

describe("GET /api/files/usage", () => {
  test("sums managed bytes, counts external links and all files", async () => {
    await mongo.db.collection("files").insertMany([
      gridfsFile(1000),
      gridfsFile(2500),
      externalFile(),
      externalFile(),
      // A legacy disk row (no storage, no size) still counts toward fileCount.
      { _id: new ObjectId(), name: "legacy", path: "/x" },
    ]);

    const res = await usage();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ gridfsBytes: 3500, externalCount: 2, fileCount: 5 });
  });

  test("is all zeros for an empty NEST", async () => {
    expect(await (await usage()).json()).toEqual({
      gridfsBytes: 0,
      externalCount: 0,
      fileCount: 0,
    });
  });

  test("external bytes never count toward gridfsBytes", async () => {
    await mongo.db.collection("files").insertMany([
      gridfsFile(10),
      { ...externalFile(), size: 999999 },
    ]);
    expect((await (await usage()).json()).gridfsBytes).toBe(10);
  });
});

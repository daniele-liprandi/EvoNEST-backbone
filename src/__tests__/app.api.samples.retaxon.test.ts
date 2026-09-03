/** @jest-environment node */

import { Effect } from "effect";
import { ObjectId } from "mongodb";
import { runRoute } from "@/lib/effect";
import { setupTestMongo, type TestMongo } from "./helpers/mongo";
import { handleSamplePost, listSamples } from "@/app/api/samples/handlers";

jest.setTimeout(60_000);

let mongo: TestMongo;
const idA = new ObjectId();
const idB = new ObjectId();

beforeAll(async () => {
  mongo = await setupTestMongo();
});
afterAll(() => mongo.stop());

beforeEach(async () => {
  await mongo.db.collection("samples").deleteMany({});
  await mongo.db.collection("settings").deleteMany({});
  await mongo.db.collection("samples").insertMany([
    { _id: idA, name: "Aradia1", genus: "Araneus", species: "diadematus", type: "animal" },
    { _id: idB, name: "Aradia2", genus: "Araneus", species: "diadematus", type: "animal" },
    { _id: new ObjectId(), name: "Aramar1", genus: "Araneus", species: "marmoreus", type: "animal" },
  ]);
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const post = (body: unknown) =>
  runRoute(
    handleSamplePost(
      new Request("http://x/api/samples", { method: "POST", body: JSON.stringify(body) }),
    ).pipe(Effect.provide(mongo.layer)),
  );

const nameById = async (id: ObjectId) =>
  (await mongo.db.collection("samples").findOne({ _id: id }))?.name;

describe("POST /api/samples method:retaxon", () => {
  test("needs ids and taxon changes", async () => {
    const res = await post({ method: "retaxon", ids: [], changes: {} });
    expect(res.status).toBe(400);
  });

  test("updates the taxon fields without renaming when regenerateNames is false", async () => {
    const res = await post({
      method: "retaxon",
      ids: [String(idA)],
      changes: { species: "marmoreus" },
      regenerateNames: false,
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.renamed).toEqual([]);
    const doc = await mongo.db.collection("samples").findOne({ _id: idA });
    expect(doc?.species).toBe("marmoreus");
    expect(doc?.name).toBe("Aradia1");
  });

  test("regenerates names for the batch when asked", async () => {
    const res = await post({
      method: "retaxon",
      ids: [String(idA), String(idB)],
      changes: { species: "marmoreus" },
      regenerateNames: true,
    });
    const json = await res.json();
    expect(json.updated).toBe(2);
    expect(json.renamed.map((r: { to: string }) => r.to).sort()).toEqual(["Aramar2", "Aramar3"]);
    expect([await nameById(idA), await nameById(idB)].sort()).toEqual(["Aramar2", "Aramar3"]);
  });

  test("non-taxon keys in changes are ignored", async () => {
    const res = await post({
      method: "retaxon",
      ids: [String(idA)],
      changes: { genus: "Nuctenea", box: "hacked" },
      regenerateNames: false,
    });
    expect(res.status).toBe(200);
    const doc = await mongo.db.collection("samples").findOne({ _id: idA });
    expect(doc?.genus).toBe("Nuctenea");
    expect(doc?.box).toBeUndefined();
  });

  test("the samples list reflects the change", async () => {
    await post({
      method: "retaxon",
      ids: [String(idA)],
      changes: { family: "Araneidae" },
      regenerateNames: false,
    });
    const list = await (await runRoute(listSamples(new Request("http://x/api/samples")).pipe(Effect.provide(mongo.layer)))).json();
    expect(list.find((s: { _id: string }) => s._id === String(idA)).family).toBe("Araneidae");
  });
});

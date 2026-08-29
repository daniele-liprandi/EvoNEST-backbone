/** @jest-environment node */

import { Effect } from "effect";
import { ObjectId } from "mongodb";
import { runRoute } from "@/lib/effect";
import { setupTestMongo, type TestMongo } from "./helpers/mongo";
import { handleSamplePost, listSamples, deleteSample } from "@/app/api/samples/route";

jest.setTimeout(60_000);

let mongo: TestMongo;
let responsible: ObjectId;

beforeAll(async () => {
  mongo = await setupTestMongo();
  responsible = await mongo.seedUser();
});
afterAll(() => mongo.stop());
beforeEach(async () => {
  await mongo.db.collection("samples").deleteMany({});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const post = (body: unknown) =>
  runRoute(
    handleSamplePost(new Request("http://x/api/samples", { method: "POST", body: JSON.stringify(body) })).pipe(
      Effect.provide(mongo.layer),
    ),
  );

const get = (qs = "") =>
  runRoute(listSamples(new Request(`http://x/api/samples${qs}`)).pipe(Effect.provide(mongo.layer)));

const del = (id: string) =>
  runRoute(
    deleteSample(new Request("http://x/api/samples", { method: "DELETE", body: JSON.stringify({ id }) })).pipe(
      Effect.provide(mongo.layer),
    ),
  );

describe("samples — a real collection workflow", () => {
  test("animal, then a subsample that references the animal by name, resolves the parent to its ObjectId", async () => {
    const animalRes = await post({
      method: "create",
      name: "Aranea1",
      type: "animal",
      genus: "Araneus",
      species: "diadematus",
      family: "Araneidae",
      responsible: responsible.toHexString(),
    });
    expect(animalRes.status).toBe(200);
    const { _id: animalId } = await animalRes.json();
    expect(animalId).toBeTruthy();

    // Subsample references the animal by *name*, as the import UI does
    const silkRes = await post({
      method: "create",
      name: "Aranea1_silk1",
      type: "silk",
      subsampletype: "dragline",
      parentId: "Aranea1",
      responsible: responsible.toHexString(),
    });
    expect(silkRes.status).toBe(200);
    const { _id: silkId } = await silkRes.json();

    const silk = await mongo.db.collection("samples").findOne({ _id: new ObjectId(silkId) });
    expect(silk?.parentId).toBeInstanceOf(ObjectId);
    expect(silk?.parentId.toString()).toBe(String(animalId));
  });

  test("GET ?related=true attaches the parent chain to the subsample", async () => {
    const animal = await (await post({ method: "create", name: "A", type: "animal", responsible: responsible.toHexString() })).json();
    await post({ method: "create", name: "A_s1", type: "silk", parentId: "A", responsible: responsible.toHexString() });

    const res = await get("?related=true");
    const samples = await res.json();
    const silk = samples.find((s: { name: string }) => s.name === "A_s1");
    expect(silk.parentChain).toHaveLength(1);
    expect(silk.parentChain[0].name).toBe("A");
    expect(silk.parentChain[0]._id.toString()).toBe(String(animal._id));
  });

  test("a subsample referencing an unknown parent name is 404", async () => {
    const res = await post({ method: "create", name: "orphan", type: "silk", parentId: "does-not-exist", responsible: responsible.toHexString() });
    expect(res.status).toBe(404);
  });

  test("create with an unknown responsible user is 400", async () => {
    const res = await post({ method: "create", name: "x", type: "animal", responsible: new ObjectId().toHexString() });
    expect(res.status).toBe(400);
  });

  test("setfield writes the field and a logbook line, and rejects protected fields", async () => {
    const { _id } = await (await post({ method: "create", name: "S", type: "animal", responsible: responsible.toHexString() })).json();

    const okRes = await post({ method: "setfield", id: String(_id), field: "box", value: "pw01" });
    expect(okRes.status).toBe(200);

    const doc = await mongo.db.collection("samples").findOne({ _id: new ObjectId(_id) });
    expect(doc?.box).toBe("pw01");
    expect(doc?.logbook.length).toBe(2);
    expect(doc?.logbook[1][1]).toMatch(/Set box from undefined to pw01/);

    const protectedRes = await post({ method: "setfield", id: String(_id), field: "logbook", value: [] });
    expect(protectedRes.status).toBe(403);
  });

  test("incrementfield bumps the counter", async () => {
    const { _id } = await (await post({ method: "create", name: "S", type: "animal", timesFed: 0, responsible: responsible.toHexString() })).json();
    await post({ method: "incrementfield", id: String(_id), field: "timesFed" });
    await post({ method: "incrementfield", id: String(_id), field: "timesFed" });
    const doc = await mongo.db.collection("samples").findOne({ _id: new ObjectId(_id) });
    expect(doc?.timesFed).toBe(2);
  });

  test("update replaces the editable fields and keeps the logbook", async () => {
    const { _id } = await (await post({ method: "create", name: "S", type: "animal", genus: "Old", responsible: responsible.toHexString() })).json();
    const res = await post({ method: "update", id: String(_id), genus: "New", species: "sp", responsible: responsible.toHexString(), type: "animal" });
    expect(res.status).toBe(200);
    const doc = await mongo.db.collection("samples").findOne({ _id: new ObjectId(_id) });
    expect(doc?.genus).toBe("New");
    expect(doc?.logbook.length).toBe(2);
  });

  test("delete removes the sample; a bad id is 400, a missing one is 404", async () => {
    const { _id } = await (await post({ method: "create", name: "S", type: "animal", responsible: responsible.toHexString() })).json();
    expect((await del(String(_id))).status).toBe(200);
    expect((await del(String(_id))).status).toBe(404);
    expect((await del("not-an-id")).status).toBe(400);
  });
});

/** @jest-environment node */

import { Effect, Layer } from "effect";
import { ObjectId } from "mongodb";
import { runRoute, mongoLayer, testAuth } from "@/lib/effect";
import { setupTestMongo, type TestMongo } from "./helpers/mongo";
import { handleSamplePost, listSamples, deleteSample } from "@/app/api/samples/handlers";

jest.setTimeout(60_000);

let mongo: TestMongo;
let responsible: ObjectId;

beforeAll(async () => {
  mongo = await setupTestMongo();
  responsible = await mongo.seedUser();
});
afterAll(() => mongo.stop());
beforeEach(async () => {
  await Promise.all(
    ["samples", "config"].map((c) => mongo.db.collection(c).deleteMany({})),
  );
  await mongo.client.db("usersdb").collection("users").deleteMany({ role: "admin" });
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

const del = (id: string, layer = mongo.layer) =>
  runRoute(
    deleteSample(new Request("http://x/api/samples", { method: "DELETE", body: JSON.stringify({ id }) })).pipe(
      Effect.provide(layer),
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
    const animal = await (
      await post({ method: "create", name: "A", type: "animal", responsible: responsible.toHexString() })
    ).json();
    await post({ method: "create", name: "A_s1", type: "silk", parentId: "A", responsible: responsible.toHexString() });

    const res = await get("?related=true");
    const samples = await res.json();
    const silk = samples.find((s: { name: string }) => s.name === "A_s1");
    expect(silk.parentChain).toHaveLength(1);
    expect(silk.parentChain[0].name).toBe("A");
    expect(silk.parentChain[0]._id.toString()).toBe(String(animal._id));
  });

  test("a subsample referencing an unknown parent name is 404", async () => {
    const res = await post({
      method: "create",
      name: "orphan",
      type: "silk",
      parentId: "does-not-exist",
      responsible: responsible.toHexString(),
    });
    expect(res.status).toBe(404);
  });

  test("create with an unknown responsible user is 400", async () => {
    const res = await post({ method: "create", name: "x", type: "animal", responsible: new ObjectId().toHexString() });
    expect(res.status).toBe(400);
  });

  test("setfield writes the field and a logbook line, and rejects protected fields", async () => {
    const { _id } = await (
      await post({ method: "create", name: "S", type: "animal", responsible: responsible.toHexString() })
    ).json();

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
    const { _id } = await (
      await post({ method: "create", name: "S", type: "animal", timesFed: 0, responsible: responsible.toHexString() })
    ).json();
    await post({ method: "incrementfield", id: String(_id), field: "timesFed" });
    await post({ method: "incrementfield", id: String(_id), field: "timesFed" });
    const doc = await mongo.db.collection("samples").findOne({ _id: new ObjectId(_id) });
    expect(doc?.timesFed).toBe(2);
  });

  test("update replaces the editable fields and keeps the logbook", async () => {
    const { _id } = await (
      await post({ method: "create", name: "S", type: "animal", genus: "Old", responsible: responsible.toHexString() })
    ).json();
    const res = await post({
      method: "update",
      id: String(_id),
      genus: "New",
      species: "sp",
      responsible: responsible.toHexString(),
      type: "animal",
    });
    expect(res.status).toBe(200);
    const doc = await mongo.db.collection("samples").findOne({ _id: new ObjectId(_id) });
    expect(doc?.genus).toBe("New");
    expect(doc?.logbook.length).toBe(2);
  });

  test("delete removes the sample; a bad id is 400, a missing one is 404", async () => {
    const { _id } = await (
      await post({ method: "create", name: "S", type: "animal", responsible: responsible.toHexString() })
    ).json();
    expect((await del(String(_id))).status).toBe(200);
    expect((await del(String(_id))).status).toBe(404);
    expect((await del("not-an-id")).status).toBe(400);
  });
});

describe("samples — configured custom fields (#165)", () => {
  const sampleTypeConfig = {
    type: "sampletypes",
    data: [
      {
        value: "crop",
        label: "Crop",
        fields: [
          "responsible",
          { key: "plot", label: "Plot", kind: "text" },
          { key: "season", label: "Season", kind: "select", options: [] },
          { key: "notes", label: "Notes", kind: "text" },
        ],
      },
    ],
  };
  const base = { type: "crop", responsible: () => responsible.toHexString() };

  beforeEach(() => mongo.db.collection("config").insertOne(sampleTypeConfig));

  test("writes the type's admin-defined fields from the fields bag", async () => {
    const res = await post({
      method: "create",
      name: "Crop 1",
      type: base.type,
      responsible: base.responsible(),
      fields: { plot: "A3", season: "2026" },
    });
    const { _id } = await res.json();
    const doc = await mongo.db.collection("samples").findOne({ _id: new ObjectId(_id) });
    expect(doc?.plot).toBe("A3");
    expect(doc?.season).toBe("2026");
    expect(doc).not.toHaveProperty("fields");
  });

  test("ignores keys the type has not declared", async () => {
    const res = await post({
      method: "create",
      name: "Crop 2",
      type: base.type,
      responsible: base.responsible(),
      fields: { plot: "A3", secretKey: "nope" },
    });
    const { _id } = await res.json();
    const doc = await mongo.db.collection("samples").findOne({ _id: new ObjectId(_id) });
    expect(doc?.plot).toBe("A3");
    expect(doc).not.toHaveProperty("secretKey");
  });

  test("a custom field cannot shadow a core column", async () => {
    const res = await post({
      method: "create",
      name: "Crop 3",
      type: base.type,
      responsible: base.responsible(),
      notes: "real note",
      fields: { notes: "injected" },
    });
    const { _id } = await res.json();
    const doc = await mongo.db.collection("samples").findOne({ _id: new ObjectId(_id) });
    expect(doc?.notes).toBe("real note");
  });

  test("update writes the configured fields too", async () => {
    const { _id } = await (
      await post({ method: "create", name: "Crop 4", type: base.type, responsible: base.responsible() })
    ).json();
    await post({ method: "update", id: String(_id), type: "crop", responsible: base.responsible(), fields: { plot: "B7" } });
    const doc = await mongo.db.collection("samples").findOne({ _id: new ObjectId(_id) });
    expect(doc?.plot).toBe("B7");
  });
});

describe("samples — the samples.delete gate (#162)", () => {
  const asRole = (role: string) =>
    Layer.merge(mongoLayer(mongo.client), testAuth({ sub: "auth0|test", name: "T", activeDatabase: mongo.dbName, databases: [mongo.dbName], role }));

  test("a role without samples.delete is refused with 403 once an admin exists", async () => {
    await mongo.client.db("usersdb").collection("users").insertOne({ role: "admin", auth0id: "auth0|boss" });
    const { _id } = await (
      await post({ method: "create", name: "S", type: "animal", responsible: responsible.toHexString() })
    ).json();

    const res = await del(String(_id), asRole("viewer"));
    expect(res.status).toBe(403);
    expect(await mongo.db.collection("samples").findOne({ _id: new ObjectId(_id) })).not.toBeNull();
  });

  test("a granted role deletes", async () => {
    await mongo.client.db("usersdb").collection("users").insertOne({ role: "admin", auth0id: "auth0|boss" });
    const { _id } = await (
      await post({ method: "create", name: "S", type: "animal", responsible: responsible.toHexString() })
    ).json();
    const res = await del(String(_id), asRole("researcher"));
    expect(res.status).toBe(200);
  });
});

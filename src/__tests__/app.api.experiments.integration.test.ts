/** @jest-environment node */

import { Effect, Layer } from "effect";
import { ObjectId } from "mongodb";
import { runRoute, mongoLayer, testAuth } from "@/lib/effect";
import { setupTestMongo, type TestMongo } from "./helpers/mongo";
import {
  listExperiments,
  handleExperimentPost,
  deleteExperiment,
} from "@/app/api/experiments/handlers";
import { handleSamplePost } from "@/app/api/samples/handlers";

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
    ["experiments", "samples", "traits", "files"].map((c) => mongo.db.collection(c).deleteMany({})),
  );
  await mongo.client.db("usersdb").collection("users").deleteMany({ auth0id: "auth0|boss" });
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const post = (body: unknown) =>
  runRoute(
    handleExperimentPost(new Request("http://x/api/experiments", { method: "POST", body: JSON.stringify(body) })).pipe(
      Effect.provide(mongo.layer),
    ),
  );
const get = (qs = "") =>
  runRoute(listExperiments(new Request(`http://x/api/experiments${qs}`)).pipe(Effect.provide(mongo.layer)));
const del = (id: string, layer = mongo.layer) =>
  runRoute(
    deleteExperiment(new Request("http://x/api/experiments", { method: "DELETE", body: JSON.stringify({ id }) })).pipe(
      Effect.provide(layer),
    ),
  );

const makeSample = async () => {
  const res = await runRoute(
    handleSamplePost(
      new Request("http://x/api/samples", {
        method: "POST",
        body: JSON.stringify({ method: "create", name: `S-${Math.random()}`, type: "animal", responsible: responsible.toHexString() }),
      }),
    ).pipe(Effect.provide(mongo.layer)),
  );
  const { _id } = await res.json();
  return String(_id);
};

describe("experiments — a real collection workflow", () => {
  test("create (legacy shape): experiment stored, sample logbook stamped", async () => {
    const sampleId = await makeSample();
    const res = await post({
      method: "create",
      name: "Tensile 1",
      type: "tensile_test",
      sampleId,
      responsible: responsible.toHexString(),
      dataFields: { EngineeringStress: [1, 2, 3] },
    });
    expect(res.status).toBe(200);
    const { id, traitsCreated } = await res.json();
    expect(traitsCreated).toBe(0);

    const exp = await mongo.db.collection("experiments").findOne({ _id: new ObjectId(id) });
    expect(exp?.data).toEqual({ EngineeringStress: [1, 2, 3] });
    expect(exp?.originalData).toEqual({ EngineeringStress: [1, 2, 3] });
    expect(exp?.method).toBeUndefined();

    const sample = await mongo.db.collection("samples").findOne({ _id: new ObjectId(sampleId) });
    expect(sample?.logbook.at(-1)[1]).toMatch(/New experiment Tensile 1 created/);
  });

  test("create (structured shape) inserts embedded traits and logs the count", async () => {
    const sampleId = await makeSample();
    const res = await post({
      method: "create",
      name: "Structured 1",
      type: "tensile_test",
      sampleId,
      responsible: responsible.toHexString(),
      data: { channelData: [], summary: {} },
      traits: [
        { method: "create", type: "stressAtBreak", measurement: 1.2 },
        { quantity: "modulus", value: 9 },
      ],
    });
    expect(res.status).toBe(200);
    const { id, traitsCreated } = await res.json();
    expect(traitsCreated).toBe(2);

    const traits = await mongo.db.collection("traits").find({ experimentId: id }).toArray();
    expect(traits).toHaveLength(2);
    expect(traits.every((t) => t.sampleId === sampleId)).toBe(true);
    // old-style keys are remapped, and the API-dispatch key is not persisted
    expect(traits.map((t) => t.quantity).sort()).toEqual(["modulus", "stressAtBreak"]);
    expect(traits.find((t) => t.quantity === "stressAtBreak")?.value).toBe(1.2);
    expect(traits.every((t) => t.method === undefined && t.type === undefined)).toBe(true);

    const exp = await mongo.db.collection("experiments").findOne({ _id: new ObjectId(id) });
    expect(exp?.traits).toBeUndefined(); // embedded traits are not kept on the experiment
    expect(exp?.logbook.some((l: string[]) => /Automatically created 2 traits/.test(l[1]))).toBe(true);
  });

  test("create rejects a missing sampleId (400) and an unknown responsible (400)", async () => {
    expect((await post({ method: "create", name: "x", type: "t", responsible: responsible.toHexString() })).status).toBe(400);
    const sampleId = await makeSample();
    expect((await post({ method: "create", name: "x", type: "t", sampleId, responsible: new ObjectId().toHexString() })).status).toBe(400);
  });

  test("unknown method is 400", async () => {
    expect((await post({ method: "frobnicate" })).status).toBe(400);
    expect((await post({})).status).toBe(400);
  });

  test("setfield updates the field and logs the change; a missing experiment is 404", async () => {
    const sampleId = await makeSample();
    const { id } = await (
      await post({ method: "create", name: "E", type: "t", sampleId, responsible: responsible.toHexString(), dataFields: {} })
    ).json();

    const res = await post({ method: "setfield", id: String(id), field: "status", value: "completed" });
    expect(res.status).toBe(200);
    const exp = await mongo.db.collection("experiments").findOne({ _id: new ObjectId(id) });
    expect(exp?.status).toBe("completed");
    expect(exp?.logbook.at(-1)[1]).toMatch(/Set status from undefined to completed/);

    expect((await post({ method: "setfield", id: new ObjectId().toHexString(), field: "x", value: 1 })).status).toBe(404);
    expect((await post({ method: "setfield", id: "nope", field: "x", value: 1 })).status).toBe(400);
  });

  test("GET excludes data by default, includes it with includeRawData, and attaches relations", async () => {
    const sampleId = await makeSample();
    await post({ method: "create", name: "E1", type: "tensile_test", sampleId, responsible: responsible.toHexString(), dataFields: { x: [1] } });

    const plain = await (await get("?type=tensile_test")).json();
    expect(plain[0].data).toBeUndefined();

    const raw = await (await get("?includeRawData=true")).json();
    expect(raw[0].data).toEqual({ x: [1] });
    expect(raw[0].rawdata).toEqual({ x: [1] });
    expect(raw[0].isOriginalData).toBe(false);

    const related = await (await get("?related=true")).json();
    expect(related[0].sample._id.toString()).toBe(sampleId);
    expect(Array.isArray(related[0].traits)).toBe(true);
  });
});

describe("experiments — delete + the experiments.delete gate (#162)", () => {
  const asRole = (role: string) =>
    Layer.merge(
      mongoLayer(mongo.client),
      testAuth({ sub: "auth0|test", name: "T", activeDatabase: mongo.dbName, databases: [mongo.dbName], role }),
    );

  test("delete removes the experiment; a missing one is 404, a bad id is 400", async () => {
    const sampleId = await makeSample();
    const { id } = await (
      await post({ method: "create", name: "E", type: "t", sampleId, responsible: responsible.toHexString(), dataFields: {} })
    ).json();
    expect((await del(String(id))).status).toBe(200);
    expect((await del(String(id))).status).toBe(404);
    expect((await del("nope")).status).toBe(400);
  });

  test("a role without experiments.delete is refused with 403 once an admin exists", async () => {
    await mongo.client.db("usersdb").collection("users").insertOne({ role: "admin", auth0id: "auth0|boss" });
    const sampleId = await makeSample();
    const { id } = await (
      await post({ method: "create", name: "E", type: "t", sampleId, responsible: responsible.toHexString(), dataFields: {} })
    ).json();

    const res = await del(String(id), asRole("viewer"));
    expect(res.status).toBe(403);
    expect(await mongo.db.collection("experiments").findOne({ _id: new ObjectId(id) })).not.toBeNull();

    expect((await del(String(id), asRole("researcher"))).status).toBe(200);
  });
});

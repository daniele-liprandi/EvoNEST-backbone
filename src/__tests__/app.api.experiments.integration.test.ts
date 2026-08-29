/** @jest-environment node */

import { Effect } from "effect";
import { ObjectId } from "mongodb";
import { runRoute } from "@/lib/effect";
import { setupTestMongo, type TestMongo } from "./helpers/mongo";
import { handleExperimentPost, listExperiments, deleteExperiment } from "@/app/api/experiments/route";
import { handleSamplePost } from "@/app/api/samples/route";
import { handleTraitPost } from "@/app/api/traits/route";

jest.setTimeout(60_000);

let mongo: TestMongo;
let responsible: ObjectId;

beforeAll(async () => {
  mongo = await setupTestMongo();
  responsible = await mongo.seedUser();
});
afterAll(() => mongo.stop());
beforeEach(async () => {
  await Promise.all(["experiments", "samples", "traits", "files"].map((c) => mongo.db.collection(c).deleteMany({})));
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const expPost = (body: unknown) =>
  runRoute(
    handleExperimentPost(new Request("http://x/api/experiments", { method: "POST", body: JSON.stringify(body) })).pipe(
      Effect.provide(mongo.layer),
    ),
  );
const expGet = (qs = "") =>
  runRoute(listExperiments(new Request(`http://x/api/experiments${qs}`)).pipe(Effect.provide(mongo.layer)));
const expDel = (id: string) =>
  runRoute(
    deleteExperiment(new Request("http://x/api/experiments", { method: "DELETE", body: JSON.stringify({ id }) })).pipe(
      Effect.provide(mongo.layer),
    ),
  );

async function makeSample() {
  const res = await runRoute(
    handleSamplePost(
      new Request("http://x/api/samples", {
        method: "POST",
        body: JSON.stringify({ method: "create", name: `S-${Math.random()}`, type: "animal", responsible: responsible.toHexString() }),
      }),
    ).pipe(Effect.provide(mongo.layer)),
  );
  return String((await res.json())._id);
}

describe("experiments — cross-collection workflow", () => {
  test("create an experiment for a sample: experiment stored, sample stamped + logged", async () => {
    const sampleId = await makeSample();
    const res = await expPost({
      method: "create",
      name: "TT-1",
      type: "tensile_test",
      sampleId,
      responsible: responsible.toHexString(),
    });
    expect(res.status).toBe(200);
    const { id } = await res.json();

    const exp = await mongo.db.collection("experiments").findOne({ _id: new ObjectId(id) });
    expect(exp?.name).toBe("TT-1");
    const sample = await mongo.db.collection("samples").findOne({ _id: new ObjectId(sampleId) });
    expect(sample?.recentTraitChangeDate).toBeTruthy();
    expect(sample?.logbook.at(-1)[1]).toMatch(/New experiment TT-1 created for sample/);
  });

  test("structured create with embedded traits inserts them with consistent experimentId/sampleId/responsible", async () => {
    const sampleId = await makeSample();
    const res = await expPost({
      method: "create",
      name: "TT-2",
      type: "tensile_test",
      sampleId,
      responsible: responsible.toHexString(),
      data: { EngineeringStress: [1, 2] },
      traits: [
        { type: "modulus", measurement: 3000, unit: "MPa" },
        { type: "stressAtBreak", measurement: 900, unit: "MPa" },
      ],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.traitsCreated).toBe(2);

    const traits = await mongo.db.collection("traits").find({}).toArray();
    expect(traits).toHaveLength(2);
    expect(traits.every((t) => t.experimentId === String(body.id))).toBe(true);
    expect(traits.every((t) => t.sampleId === sampleId)).toBe(true);
    expect(traits.every((t) => t.responsible === responsible.toHexString())).toBe(true);

    const exp = await mongo.db.collection("experiments").findOne({ _id: new ObjectId(body.id) });
    expect(exp?.traits).toBeUndefined(); // extracted, not embedded
    expect(exp?.logbook.some((l: string[]) => l[1].includes("Automatically created 2 traits"))).toBe(true);
  });

  test("missing sampleId -> 400, unknown responsible -> 400, unknown method -> 400", async () => {
    expect((await expPost({ method: "create", name: "x", type: "t", responsible: responsible.toHexString() })).status).toBe(400);
    const sampleId = await makeSample();
    expect((await expPost({ method: "create", name: "x", type: "t", sampleId, responsible: new ObjectId().toHexString() })).status).toBe(400);
    expect((await expPost({ method: "frobnicate", sampleId })).status).toBe(400);
  });

  test("setfield updates one field with a logbook line", async () => {
    const sampleId = await makeSample();
    const { id } = await (await expPost({ method: "create", name: "E", type: "t", sampleId, responsible: responsible.toHexString() })).json();
    const res = await expPost({ method: "setfield", id: String(id), field: "notes", value: "checked" });
    expect(res.status).toBe(200);
    const exp = await mongo.db.collection("experiments").findOne({ _id: new ObjectId(id) });
    expect(exp?.notes).toBe("checked");
    expect(exp?.logbook.at(-1)[1]).toMatch(/Set notes from/);
  });

  test("GET ?related=true attaches the sample chain and that sample's traits", async () => {
    const sampleId = await makeSample();
    await runRoute(
      handleTraitPost(
        new Request("http://x/api/traits", {
          method: "POST",
          body: JSON.stringify({ method: "create", sampleId, type: "weight", measurement: 1, responsible: responsible.toHexString() }),
        }),
      ).pipe(Effect.provide(mongo.layer)),
    );
    await expPost({ method: "create", name: "E", type: "t", sampleId, responsible: responsible.toHexString() });

    const res = await expGet("?related=true");
    const [exp] = await res.json();
    expect(exp.sample._id.toString()).toBe(sampleId);
    expect(exp.sampleChain).toHaveLength(1);
    expect(exp.traits).toHaveLength(1);
    expect(exp.traits[0].type).toBe("weight");
  });

  test("GET default hides bulk data; ?includeRawData=true surfaces it as rawdata", async () => {
    const sampleId = await makeSample();
    await expPost({
      method: "create",
      name: "E",
      type: "t",
      sampleId,
      responsible: responsible.toHexString(),
      data: { EngineeringStress: [1, 2, 3] },
    });

    const lean = await (await expGet()).json();
    expect(lean[0].data).toBeUndefined();

    const full = await (await expGet("?includeRawData=true")).json();
    expect(full[0].rawdata.EngineeringStress).toEqual([1, 2, 3]);
    expect(full[0].isOriginalData).toBe(false);
  });

  test("delete: 404 for a missing experiment, ok for a present one with no file", async () => {
    expect((await expDel(new ObjectId().toHexString())).status).toBe(404);
    const sampleId = await makeSample();
    const { id } = await (await expPost({ method: "create", name: "E", type: "t", sampleId, responsible: responsible.toHexString() })).json();
    const res = await expDel(String(id));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ fileDeleted: false, fileDocDeleted: false });
    expect(await mongo.db.collection("experiments").countDocuments()).toBe(0);
  });
});

/** @jest-environment node */

import { Effect, Layer } from "effect";
import { ObjectId } from "mongodb";
import { runRoute, mongoLayer, testAuth } from "@/lib/effect";
import { setupTestMongo, type TestMongo } from "./helpers/mongo";
import { handleTraitPost, listTraits, deleteTrait } from "@/app/api/traits/handlers";
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
    ["traits", "samples", "experiments", "rawdata"].map((c) => mongo.db.collection(c).deleteMany({})),
  );
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const traitPost = (body: unknown) =>
  runRoute(
    handleTraitPost(new Request("http://x/api/traits", { method: "POST", body: JSON.stringify(body) })).pipe(
      Effect.provide(mongo.layer),
    ),
  );
const traitGet = (qs = "") =>
  runRoute(listTraits(new Request(`http://x/api/traits${qs}`)).pipe(Effect.provide(mongo.layer)));
const traitDel = (id: string) =>
  runRoute(
    deleteTrait(new Request("http://x/api/traits", { method: "DELETE", body: JSON.stringify({ id }) })).pipe(
      Effect.provide(mongo.layer),
    ),
  );
const samplePost = (body: unknown) =>
  runRoute(
    handleSamplePost(new Request("http://x/api/samples", { method: "POST", body: JSON.stringify(body) })).pipe(
      Effect.provide(mongo.layer),
    ),
  );

async function makeSample(fields: Record<string, unknown> = {}) {
  const res = await samplePost({ method: "create", name: `S-${Math.random()}`, type: "animal", responsible: responsible.toHexString(), ...fields });
  const { _id } = await res.json();
  return String(_id);
}

describe("traits — cross-collection workflow", () => {
  test("create a trait on a sample: the trait is stored and the sample is stamped + logged", async () => {
    const sampleId = await makeSample({ genus: "Araneus", species: "diadematus" });

    const res = await traitPost({
      method: "create",
      sampleId,
      quantity: "diameter",
      value: 3.5,
      unit: "um",
      responsible: responsible.toHexString(),
    });
    expect(res.status).toBe(200);
    const { id: traitId } = await res.json();

    const trait = await mongo.db.collection("traits").findOne({ _id: new ObjectId(traitId) });
    expect(trait?.sampleId).toBe(sampleId);
    expect(trait?.method).toBeUndefined(); // method not persisted

    const sample = await mongo.db.collection("samples").findOne({ _id: new ObjectId(sampleId) });
    expect(sample?.recentTraitChangeDate).toBeTruthy();
    expect(sample?.logbook.at(-1)[1]).toMatch(/New trait of quantity diameter and value 3.5/);
  });

  test("create against a missing sample is 404; a bad responsible is 400", async () => {
    expect((await traitPost({ method: "create", sampleId: new ObjectId().toHexString(), quantity: "x", responsible: responsible.toHexString() })).status).toBe(404);
    const sampleId = await makeSample();
    expect((await traitPost({ method: "create", sampleId, quantity: "x", responsible: new ObjectId().toHexString() })).status).toBe(400);
  });

  test("update stamps both the trait and its sample (previously a ReferenceError)", async () => {
    const sampleId = await makeSample();
    const { id: traitId } = await (await traitPost({ method: "create", sampleId, quantity: "weight", value: 1, responsible: responsible.toHexString() })).json();

    const res = await traitPost({ method: "update", id: String(traitId), sampleId, value: 2, unit: "mg" });
    expect(res.status).toBe(200);

    const trait = await mongo.db.collection("traits").findOne({ _id: new ObjectId(traitId) });
    expect(trait?.value).toBe(2);
    const sample = await mongo.db.collection("samples").findOne({ _id: new ObjectId(sampleId) });
    expect(sample?.logbook.some((l: string[]) => l[1].includes(`Updated trait ${traitId}`))).toBe(true);
  });

  test("setfield writes a field, rejects protected ones; incrementfield bumps a counter", async () => {
    const sampleId = await makeSample();
    const { id } = await (await traitPost({ method: "create", sampleId, quantity: "diameter", value: 1, count: 0, responsible: responsible.toHexString() })).json();

    expect((await traitPost({ method: "setfield", id: String(id), field: "detail", value: "dragline" })).status).toBe(200);
    expect((await traitPost({ method: "setfield", id: String(id), field: "sampleId", value: "x" })).status).toBe(403);

    await traitPost({ method: "incrementfield", id: String(id), field: "count" });
    const trait = await mongo.db.collection("traits").findOne({ _id: new ObjectId(id) });
    expect(trait?.detail).toBe("dragline");
    expect(trait?.count).toBe(1);
  });

  test("GET ?includeSampleFeatures=true copies sample taxonomy onto each trait", async () => {
    const sampleId = await makeSample({ genus: "Nephila", species: "clavipes", family: "Araneidae" });
    await traitPost({ method: "create", sampleId, quantity: "weight", value: 5, responsible: responsible.toHexString() });

    const res = await traitGet("?includeSampleFeatures=true");
    const [trait] = await res.json();
    expect(trait.genus).toBe("Nephila");
    expect(trait.species).toBe("clavipes");
  });

  test("GET ?related=true attaches the sample chain (subsample -> animal)", async () => {
    const animalId = await makeSample({ name: "An1", genus: "Araneus" });
    const silkRes = await samplePost({ method: "create", name: "An1_s1", type: "silk", parentId: "An1", responsible: responsible.toHexString() });
    const { _id: silkId } = await silkRes.json();
    await traitPost({ method: "create", sampleId: String(silkId), quantity: "diameter", value: 2, responsible: responsible.toHexString() });

    const res = await traitGet("?related=true");
    const trait = (await res.json()).find((t: { quantity: string }) => t.quantity === "diameter");
    expect(trait.sampleChain.map((s: { name: string }) => s.name)).toEqual(["An1_s1", "An1"]);
  });

  test("GET computes a crossSection and appends a derived cross_section trait for diameter traits", async () => {
    const sampleId = await makeSample();
    await traitPost({ method: "create", sampleId, quantity: "diameter", value: 4, unit: "um", nfibres: "1", responsible: responsible.toHexString() });

    const res = await traitGet();
    const traits = await res.json();
    const diameter = traits.find((t: { quantity: string }) => t.quantity === "diameter");
    expect(diameter.crossSection.area.single).toBeCloseTo(Math.PI * 4);
    expect(traits.some((t: { quantity: string }) => t.quantity === "cross_section")).toBe(true);
  });

  test("conversion scales trait measurements and experiment values, reset restores them", async () => {
    const sampleId = await makeSample();
    const { id: traitId } = await (await traitPost({ method: "create", sampleId, quantity: "diameter", value: 10, responsible: responsible.toHexString() })).json();

    const expId = new ObjectId();
    await mongo.db.collection("experiments").insertOne({
      _id: expId, sampleId, stressAtBreak: 100, toughness: 50, offsetYieldStress: 20, modulus: 200, specimenDiameter: 10, logbook: [],
    });
    await mongo.db.collection("rawdata").insertOne({ experimentId: expId, data: { EngineeringStress: [1, 2, 3] } });

    const conv = { ratio: 2, oldDiameters: [10], newDiameters: [14], oldCrossSection: 78, newCrossSection: 154 };
    const convRes = await traitPost({ method: "conversion", traits: [{ id: String(traitId), value: 20 }], conversion: conv });
    expect(convRes.status).toBe(200);

    let trait = await mongo.db.collection("traits").findOne({ _id: new ObjectId(traitId) });
    let exp = await mongo.db.collection("experiments").findOne({ _id: expId });
    let raw = await mongo.db.collection("rawdata").findOne({ experimentId: expId });
    expect(trait?.value).toBe(20);
    expect(trait?.diameterConversion.ratio).toBe(2);
    expect(exp?.stressAtBreak).toBe(200);
    expect(exp?.originalStressAtBreak).toBe(100);
    expect(raw?.data.EngineeringStress).toEqual([2, 4, 6]);

    const resetRes = await traitPost({ method: "reset", traits: [{ id: String(traitId), value: null }] });
    expect(resetRes.status).toBe(200);

    trait = await mongo.db.collection("traits").findOne({ _id: new ObjectId(traitId) });
    exp = await mongo.db.collection("experiments").findOne({ _id: expId });
    raw = await mongo.db.collection("rawdata").findOne({ experimentId: expId });
    expect(trait?.value).toBe(10);
    expect(trait?.diameterConversion).toBeUndefined();
    expect(exp?.stressAtBreak).toBe(100);
    expect(exp?.originalStressAtBreak).toBeUndefined();
    expect(raw?.data.EngineeringStress).toEqual([1, 2, 3]);
  });

  test("delete: ok, then 404, and 400 for a bad id", async () => {
    const sampleId = await makeSample();
    const { id } = await (await traitPost({ method: "create", sampleId, quantity: "x", responsible: responsible.toHexString() })).json();
    expect((await traitDel(String(id))).status).toBe(200);
    expect((await traitDel(String(id))).status).toBe(404);
    expect((await traitDel("nope")).status).toBe(400);
  });

  test("the traits.delete gate: 403 for an ungranted role once an admin exists, 200 for a granted one", async () => {
    await mongo.client.db("usersdb").collection("users").insertOne({ role: "admin", auth0id: "auth0|boss" });
    const asRole = (role: string) =>
      Layer.merge(
        mongoLayer(mongo.client),
        testAuth({ sub: "auth0|test", name: "T", activeDatabase: mongo.dbName, databases: [mongo.dbName], role }),
      );
    const delAs = (id: string, role: string) =>
      runRoute(
        deleteTrait(new Request("http://x/api/traits", { method: "DELETE", body: JSON.stringify({ id }) })).pipe(
          Effect.provide(asRole(role)),
        ),
      );

    const sampleId = await makeSample();
    const { id } = await (await traitPost({ method: "create", sampleId, quantity: "x", responsible: responsible.toHexString() })).json();
    expect((await delAs(String(id), "viewer")).status).toBe(403);
    expect((await delAs(String(id), "researcher")).status).toBe(200);

    await mongo.client.db("usersdb").collection("users").deleteMany({ auth0id: "auth0|boss" });
  });
});

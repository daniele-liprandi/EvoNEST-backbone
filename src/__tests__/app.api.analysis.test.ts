/** @jest-environment node */

import { Effect } from "effect";
import { ObjectId } from "mongodb";
import { runRoute } from "@/lib/effect";
import { setupTestMongo, type TestMongo } from "./helpers/mongo";
import { analysisOptions, runAnalysis } from "@/app/api/analysis/handlers";
import { NOT_RECORDED } from "@/lib/analysis/pivot";

jest.setTimeout(60_000);

let mongo: TestMongo;
let alice: ObjectId;

beforeAll(async () => {
  mongo = await setupTestMongo();
  alice = await mongo.seedUser({ name: "Alice" });
});
afterAll(() => mongo.stop());
beforeEach(async () => {
  await Promise.all(["traits", "samples", "config"].map((c) => mongo.db.collection(c).deleteMany({})));
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const post = (body: unknown) =>
  runRoute(
    runAnalysis(new Request("http://x/api/analysis", { method: "POST", body: JSON.stringify(body) })).pipe(
      Effect.provide(mongo.layer),
    ),
  );
const options = (qs = "") =>
  runRoute(analysisOptions(new Request(`http://x/api/analysis${qs}`)).pipe(Effect.provide(mongo.layer)));

const seedConfig = () =>
  mongo.db.collection("config").insertMany([
    { type: "traitquantities", data: [{ value: "mass", label: "Mass", unit: "g" }] },
    {
      type: "sampletypes",
      data: [
        { value: "animal", fields: ["taxonomy", "sex", { key: "plot", label: "Plot", kind: "text" }, { key: "remarks", label: "Remarks", kind: "textarea" }] },
      ],
    },
  ]);

const seedSamples = async () => {
  const s1 = new ObjectId();
  const s2 = new ObjectId();
  const s3 = new ObjectId();
  await mongo.db.collection("samples").insertMany([
    { _id: s1, name: "A1", type: "animal", genus: "Araneus", species: "diadematus", subsampletype: "dragline", sex: "female", date: "2024-03-02", responsible: alice.toHexString(), logbook: [] },
    { _id: s2, name: "N1", type: "animal", genus: "Nephila", species: "clavipes", silktype: "dragline", sex: "male", date: "2025-07-10" },
    { _id: s3, name: "A1_si1", type: "silk", genus: "Araneus", species: "diadematus", parentId: s1.toHexString() },
  ]);
  return { s1, s2, s3 };
};

describe("POST /api/analysis, traits", () => {
  test("400 without a quantity, or with an unknown dimension", async () => {
    expect((await post({ source: "traits" })).status).toBe(400);
    await seedConfig();
    expect((await post({ source: "traits", quantity: "mass", rows: ["_id"] })).status).toBe(400);
  });

  test("converts each trait from its stored unit to the configured one", async () => {
    await seedConfig();
    const { s1 } = await seedSamples();
    await mongo.db.collection("traits").insertMany([
      { quantity: "mass", value: 2000, unit: "mg", sampleId: s1.toHexString() },
      { quantity: "mass", value: 0.004, unit: "kg", sampleId: s1.toHexString() },
      { quantity: "mass", value: 9, unit: "m", sampleId: s1.toHexString() }, // incompatible: as stored
    ]);
    const body = await (await post({ quantity: "mass" })).json();
    expect(body.unit).toBe("g");
    expect(body.total).toMatchObject({ n: 3, mean: 5, min: 2, max: 9, median: 4 });
  });

  test("unitConversion false leaves values as stored and no unit", async () => {
    await seedConfig();
    const { s1 } = await seedSamples();
    await mongo.db.collection("traits").insertOne({ quantity: "mass", value: 2000, unit: "mg", sampleId: s1.toHexString() });
    const body = await (await post({ quantity: "mass", unitConversion: false })).json();
    expect(body.unit).toBe("");
    expect(body.total.mean).toBe(2000);
  });

  test("groups by species then subsample type (silktype fallback), and by a configured field", async () => {
    await seedConfig();
    const { s1, s2 } = await seedSamples();
    await mongo.db.collection("traits").insertMany([
      { quantity: "mass", value: 1, unit: "g", sampleId: s1.toHexString() },
      { quantity: "mass", value: 3, unit: "g", sampleId: s1.toHexString() },
      { quantity: "mass", value: 5, unit: "g", sampleId: s2.toHexString() },
    ]);
    const bySpecies = await (await post({ quantity: "mass", rows: ["species", "subsampletype"] })).json();
    expect(bySpecies.rows.map((r: { key: string[]; total: { n: number; mean: number } }) => [r.key, r.total.n, r.total.mean])).toEqual([
      [["Araneus diadematus", "dragline"], 2, 2],
      [["Nephila clavipes", "dragline"], 1, 5],
    ]);
    const bySex = await (await post({ quantity: "mass", rows: ["sex"] })).json();
    expect(bySex.rows.map((r: { key: string[] }) => r.key[0])).toEqual(["female", "male"]);
  });

  test("filters, including on Not recorded", async () => {
    await seedConfig();
    const { s1, s2, s3 } = await seedSamples();
    await mongo.db.collection("traits").insertMany([
      { quantity: "mass", value: 1, unit: "g", sampleId: s1.toHexString() },
      { quantity: "mass", value: 5, unit: "g", sampleId: s2.toHexString() },
      { quantity: "mass", value: 7, unit: "g", sampleId: s3.toHexString() },
    ]);
    const body = await (await post({ quantity: "mass", filters: { sex: ["female", NOT_RECORDED] } })).json();
    expect(body.total).toMatchObject({ n: 2, mean: 4 });
    expect(body.metadata).toMatchObject({ total: 3, matched: 2 });
  });
});

describe("POST /api/analysis, samples", () => {
  test("counts samples by type by column, with responsible names, parent names and date buckets", async () => {
    await seedConfig();
    await seedSamples();
    const byType = await (await post({ source: "samples", rows: ["type"], column: "year" })).json();
    expect(byType.columns).toEqual(["2024", "2025", NOT_RECORDED]);
    expect(byType.rows[0]).toMatchObject({ key: ["animal"], total: { n: 2, mean: null } });
    expect(byType.rows[0].cells["2024"].n).toBe(1);
    expect(byType.columnTotals[NOT_RECORDED].n).toBe(1);

    const byPerson = await (await post({ source: "samples", rows: ["responsible", "parent"] })).json();
    expect(byPerson.rows.map((r: { key: string[] }) => r.key)).toEqual([
      ["Alice", NOT_RECORDED],
      [NOT_RECORDED, "A1"],
      [NOT_RECORDED, NOT_RECORDED],
    ]);
  });
});

describe("GET /api/analysis", () => {
  test("dimensions from config without internal or free-text fields, values per dimension, quantities with counts", async () => {
    await seedConfig();
    const { s1 } = await seedSamples();
    await mongo.db.collection("traits").insertMany([
      { quantity: "mass", value: 1, sampleId: s1.toHexString(), nfibres: "Bundle" },
      { quantity: "modulus", value: 9e9, unit: "Pa", sampleId: s1.toHexString() },
      { quantity: "modulus", value: 9, unit: "GPa", sampleId: s1.toHexString() },
    ]);
    const body = await (await options("?source=traits")).json();
    const ids = body.dimensions.map((d: { id: string }) => d.id);
    expect(ids).toEqual(expect.arrayContaining(["type", "species", "sex", "plot", "year", "nfibres"]));
    expect(ids).not.toContain("remarks");
    expect(ids).not.toContain("_id");
    expect(body.dimensions.find((d: { id: string }) => d.id === "sex").values).toEqual(["female", "male", NOT_RECORDED]);
    expect(body.dimensions.find((d: { id: string }) => d.id === "nfibres").values).toEqual(["bundle", NOT_RECORDED]);
    expect(body.quantities).toEqual([
      { value: "mass", label: "Mass", unit: "g", count: 1, units: [] },
      { value: "modulus", label: "modulus", unit: null, count: 2, units: ["GPa", "Pa"] },
    ]);

    const samples = await (await options("?source=samples")).json();
    expect(samples.dimensions.map((d: { id: string }) => d.id)).not.toContain("nfibres");
  });
});

/** @jest-environment node */

import { Effect } from "effect";
import { ObjectId } from "mongodb";
import { runRoute } from "@/lib/effect";
import { setupTestMongo, type TestMongo } from "./helpers/mongo";
import { analyseTraits, analysisFilterOptions } from "@/app/api/traits/analysis/handlers";

jest.setTimeout(60_000);

let mongo: TestMongo;

beforeAll(async () => {
  mongo = await setupTestMongo();
});
afterAll(() => mongo.stop());
beforeEach(async () => {
  await Promise.all(["traits", "samples"].map((c) => mongo.db.collection(c).deleteMany({})));
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const post = (body: unknown) =>
  runRoute(
    analyseTraits(new Request("http://x/api/traits/analysis", { method: "POST", body: JSON.stringify(body) })).pipe(
      Effect.provide(mongo.layer),
    ),
  );

const seed = async () => {
  const s1 = new ObjectId();
  const s2 = new ObjectId();
  await mongo.db.collection("samples").insertMany([
    { _id: s1, genus: "Araneus", species: "diadematus", silktype: "dragline" },
    { _id: s2, genus: "Nephila", species: "clavipes", silktype: "dragline" },
  ]);
  await mongo.db.collection("traits").insertMany([
    { type: "stressAtBreak", measurement: 1_000_000_000, sampleId: s1.toHexString(), nfibres: "1" },
    { type: "stressAtBreak", measurement: 2_000_000_000, sampleId: s1.toHexString(), nfibres: "1" },
    { type: "stressAtBreak", measurement: 3_000_000_000, sampleId: s2.toHexString(), nfibres: "2" },
    { type: "diameter", measurement: 4, sampleId: s1.toHexString() },
  ]);
};

describe("POST /api/traits/analysis", () => {
  test("400 when traitType is missing", async () => {
    expect((await post({})).status).toBe(400);
  });

  test("groupBy all: converts Pa->GPa and reports the stats + display unit", async () => {
    await seed();
    const res = await post({ traitType: "stressAtBreak", groupBy: "all" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.unit).toBe("GPa");
    expect(body.results).toHaveLength(1);
    expect(body.results[0].mean).toBe(2); // (1 + 2 + 3) / 3 GPa
    expect(body.results[0].count).toBe(3);
    expect(body.metadata.totalTraits).toBe(3);
  });

  test("groupBy species splits the values per group", async () => {
    await seed();
    const body = await (await post({ traitType: "stressAtBreak", groupBy: "species" })).json();
    const byName = Object.fromEntries(body.results.map((r: { name: string; mean: number }) => [r.name, r.mean]));
    expect(byName.diadematus).toBe(1.5);
    expect(byName.clavipes).toBe(3);
  });

  test("unitConversion:false leaves the raw measurement and an empty unit", async () => {
    await seed();
    const body = await (await post({ traitType: "stressAtBreak", groupBy: "all", unitConversion: false })).json();
    expect(body.unit).toBe("");
    expect(body.results[0].mean).toBe(2000000000);
  });
});

describe("GET /api/traits/analysis (filter options)", () => {
  test("returns the distinct trait types, silk types and nfibres", async () => {
    await seed();
    const body = await (await runRoute(analysisFilterOptions.pipe(Effect.provide(mongo.layer)))).json();
    expect(body.traitTypes).toEqual(["diameter", "stressAtBreak"]);
    expect(body.sampleSubTypes).toEqual(["dragline"]);
    expect(body.nfibres).toEqual(["1", "2"]);
  });
});

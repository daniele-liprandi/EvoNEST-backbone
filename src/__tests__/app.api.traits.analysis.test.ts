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
  await Promise.all(["traits", "samples", "config"].map((c) => mongo.db.collection(c).deleteMany({})));
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const post = (body: unknown) =>
  runRoute(
    analyseTraits(new Request("http://x/api/traits/analysis", { method: "POST", body: JSON.stringify(body) })).pipe(
      Effect.provide(mongo.layer),
    ),
  );

const seedConfig = () =>
  mongo.db.collection("config").insertOne({
    type: "traittypes",
    data: [
      { value: "mass", label: "Mass", unit: "g" },
      { value: "diameter", label: "Diameter", unit: "mm" },
    ],
  });

const seedSamples = async () => {
  const s1 = new ObjectId();
  const s2 = new ObjectId();
  await mongo.db.collection("samples").insertMany([
    { _id: s1, genus: "Araneus", species: "diadematus", subsampletype: "dragline", sex: "female" },
    { _id: s2, genus: "Nephila", species: "clavipes", silktype: "dragline", sex: "male" },
  ]);
  return { s1, s2 };
};

describe("POST /api/traits/analysis — config-driven units (#164)", () => {
  test("400 when quantity is missing", async () => {
    expect((await post({})).status).toBe(400);
  });

  test("converts each trait from its stored unit to the type's configured unit", async () => {
    await seedConfig();
    const { s1 } = await seedSamples();
    // config says mass is in `g`; these are stored in mg and kg
    await mongo.db.collection("traits").insertMany([
      { quantity: "mass", value: 2000, unit: "mg", sampleId: s1.toHexString() }, // -> 2 g
      { quantity: "mass", value: 0.004, unit: "kg", sampleId: s1.toHexString() }, // -> 4 g
    ]);

    const body = await (await post({ quantity: "mass", groupBy: "all" })).json();
    expect(body.unit).toBe("g");
    expect(body.results[0].mean).toBe(3); // (2 + 4) / 2
    expect(body.results[0].min).toBe(2);
    expect(body.results[0].max).toBe(4);
  });

  test("a trait already in the target unit, or with an incompatible unit, is left alone", async () => {
    await seedConfig();
    const { s1 } = await seedSamples();
    await mongo.db.collection("traits").insertMany([
      { quantity: "mass", value: 5, unit: "g", sampleId: s1.toHexString() }, // already g
      { quantity: "mass", value: 9, unit: "m", sampleId: s1.toHexString() }, // incompatible -> as-is
    ]);
    const body = await (await post({ quantity: "mass", groupBy: "all" })).json();
    expect(body.results[0].values ?? [body.results[0].min, body.results[0].max]).toBeTruthy();
    expect(body.results[0].min).toBe(5);
    expect(body.results[0].max).toBe(9);
  });

  test("unitConversion:false leaves raw values and an empty unit badge", async () => {
    await seedConfig();
    const { s1 } = await seedSamples();
    await mongo.db.collection("traits").insertOne({ quantity: "mass", value: 2000, unit: "mg", sampleId: s1.toHexString() });
    const body = await (await post({ quantity: "mass", groupBy: "all", unitConversion: false })).json();
    expect(body.unit).toBe("");
    expect(body.results[0].mean).toBe(2000);
  });

  test("no configured unit for the trait type: values pass through, empty unit", async () => {
    const { s1 } = await seedSamples();
    await mongo.db.collection("traits").insertOne({ quantity: "custom", value: 7, unit: "widget", sampleId: s1.toHexString() });
    const body = await (await post({ quantity: "custom", groupBy: "all" })).json();
    expect(body.unit).toBe("");
    expect(body.results[0].mean).toBe(7);
  });
});

describe("POST /api/traits/analysis — generic grouping (#164)", () => {
  test("groupBy any sample field", async () => {
    await seedConfig();
    const { s1, s2 } = await seedSamples();
    await mongo.db.collection("traits").insertMany([
      { quantity: "mass", value: 1, unit: "g", sampleId: s1.toHexString() },
      { quantity: "mass", value: 3, unit: "g", sampleId: s2.toHexString() },
    ]);
    const body = await (await post({ quantity: "mass", groupBy: "sex" })).json();
    const byName = Object.fromEntries(body.results.map((r: { name: string; mean: number }) => [r.name, r.mean]));
    expect(byName).toEqual({ female: 1, male: 3 });
  });

  test("groupBy subsampletype falls back to the legacy silktype field", async () => {
    await seedConfig();
    const { s1, s2 } = await seedSamples(); // s1 has subsampletype, s2 has only silktype
    await mongo.db.collection("traits").insertMany([
      { quantity: "mass", value: 1, unit: "g", sampleId: s1.toHexString() },
      { quantity: "mass", value: 3, unit: "g", sampleId: s2.toHexString() },
    ]);
    const body = await (await post({ quantity: "mass", groupBy: "subsampletype" })).json();
    // both samples' subtype resolves to "dragline"
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({ name: "dragline", count: 2, mean: 2 });
  });
});

describe("GET /api/traits/analysis (filter options)", () => {
  test("returns distinct types, the union of subsampletype+silktype, and groupByOptions", async () => {
    await mongo.db.collection("config").insertOne({
      type: "sampletypes",
      data: [
        { value: "animal", fields: ["taxonomy", "sex", { key: "plot", label: "Plot" }] },
        { value: "crop", fields: ["location"] },
      ],
    });
    const { s1 } = await seedSamples();
    await mongo.db.collection("traits").insertOne({ quantity: "mass", value: 1, unit: "g", sampleId: s1.toHexString() });

    const body = await (await runRoute(analysisFilterOptions.pipe(Effect.provide(mongo.layer)))).json();
    expect(body.traitTypes).toEqual(["mass"]);
    expect(body.sampleSubTypes).toEqual(["dragline"]); // s1 subsampletype + s2 silktype, deduped
    const groupValues = body.groupByOptions.map((o: { value: string }) => o.value);
    expect(groupValues).toEqual(expect.arrayContaining(["all", "family", "subsampletype", "sex", "plot", "location"]));
    expect(groupValues).not.toContain("taxonomy"); // non-groupable, filtered out
  });
});

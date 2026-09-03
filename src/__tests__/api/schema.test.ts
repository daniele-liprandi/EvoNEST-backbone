/** @jest-environment node */

import { Effect, Layer } from "effect";
import { runRoute, testMongo, testAuth, testNoAuth } from "@/lib/effect";
import { getSchema } from "@/app/api/schema/handlers";

const ENV = { ...process.env };
beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => {
  jest.restoreAllMocks();
  process.env = { ...ENV };
});

const CONFIG = {
  sampletypes: [
    { value: "animal", label: "Animal", fields: ["taxonomy", "sex"] },
    { value: "crop", label: "Crop", fields: ["taxonomy", { key: "plot", label: "Plot" }, { key: "treatment" }] },
  ],
  traittypes: [
    { value: "mass", label: "Mass", unit: "g" },
    { value: "count", label: "Count" },
  ],
  samplesubtypes: [{ value: "dragline", label: "Dragline" }],
};

const stub = testMongo({
  find: (_db, collection) => {
    if (collection === "samples") return Effect.succeed([{ _id: 1, name: "S1", box: "pw01", logbook: [] }]);
    if (collection === "traits") return Effect.succeed([{ _id: 1, type: "diameter", measurement: 3, data: {} }]);
    return Effect.succeed([{ _id: 1, status: "done", image: "x" }]);
  },
  findOne: (_db, _coll, filter) => {
    const type = (filter as { type?: keyof typeof CONFIG }).type;
    return Effect.succeed(type && CONFIG[type] ? { type, data: CONFIG[type] } : null);
  },
});

const req = (qs = "", headers: Record<string, string> = {}) =>
  new Request(`http://x/api/schema${qs}`, { headers });

const run = (r: Request, layer = Layer.merge(stub, testAuth({ sub: "u1", activeDatabase: "labdb" }))) =>
  runRoute(getSchema(r).pipe(Effect.provide(layer)));

describe("GET /api/schema", () => {
  test("returns per-section columns, excluding internal fields", async () => {
    const res = await run(req());
    expect(res.status).toBe(200);
    const { routes } = await res.json();
    const samples = routes.find((r: { path: string }) => r.path === "/samples/general");
    expect(samples.columns).toEqual(expect.arrayContaining(["name", "box", "responsibleName", "parentName"]));
    expect(samples.columns).not.toContain("logbook");
    expect(routes.find((r: { path: string }) => r.path === "/traits").columns).not.toContain("data");
  });

  test("returns the lab's configured sample/trait/subsample types", async () => {
    const body = await (await run(req())).json();
    expect(body.sampleTypes).toEqual([
      { value: "animal", label: "Animal", fields: ["taxonomy", "sex"] },
      { value: "crop", label: "Crop", fields: ["taxonomy", "plot", "treatment"] },
    ]);
    expect(body.traitTypes).toEqual([
      { value: "mass", label: "Mass", unit: "g" },
      { value: "count", label: "Count", unit: null },
    ]);
    expect(body.subsampleTypes).toEqual([{ value: "dragline", label: "Dragline" }]);
  });

  test("empty config is empty arrays, not an error", async () => {
    const bare = testMongo({
      find: () => Effect.succeed([]),
      findOne: () => Effect.succeed(null),
    });
    const body = await (
      await run(req(), Layer.merge(bare, testAuth({ sub: "u1", activeDatabase: "labdb" })))
    ).json();
    expect(body.sampleTypes).toEqual([]);
    expect(body.traitTypes).toEqual([]);
  });

  test("401 without a session", async () => {
    const res = await run(req(), Layer.merge(testMongo(), testNoAuth));
    expect(res.status).toBe(401);
  });

  test("a service request must pass ?dbName", async () => {
    process.env.MASTRA_SERVICE_SECRET = "svc";
    const layer = Layer.merge(stub, testNoAuth);
    expect((await run(req("", { "x-service-key": "svc" }), layer)).status).toBe(400);
    expect((await run(req("?dbName=labdb", { "x-service-key": "svc" }), layer)).status).toBe(200);
  });
});

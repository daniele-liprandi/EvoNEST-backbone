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

const docsByCollection = testMongo({
  find: (_db, collection) => {
    if (collection === "samples") return Effect.succeed([{ _id: 1, name: "S1", box: "pw01", logbook: [] }]);
    if (collection === "traits") return Effect.succeed([{ _id: 1, type: "diameter", measurement: 3, data: {} }]);
    return Effect.succeed([{ _id: 1, status: "done", image: "x" }]);
  },
});

const req = (qs = "", headers: Record<string, string> = {}) =>
  new Request(`http://x/api/schema${qs}`, { headers });

describe("GET /api/schema", () => {
  test("returns per-section columns, excluding internal fields", async () => {
    const res = await runRoute(
      getSchema(req()).pipe(Effect.provide(Layer.merge(docsByCollection, testAuth({ sub: "u1", activeDatabase: "labdb" })))),
    );
    expect(res.status).toBe(200);
    const { routes } = await res.json();
    const samples = routes.find((r: { path: string }) => r.path === "/samples/general");
    expect(samples.columns).toEqual(expect.arrayContaining(["name", "box", "responsibleName", "parentName"]));
    expect(samples.columns).not.toContain("logbook");
    const traits = routes.find((r: { path: string }) => r.path === "/traits");
    expect(traits.columns).not.toContain("data");
  });

  test("401 without a session", async () => {
    const res = await runRoute(getSchema(req()).pipe(Effect.provide(Layer.merge(testMongo(), testNoAuth))));
    expect(res.status).toBe(401);
  });

  test("a service request must pass ?dbName", async () => {
    process.env.MASTRA_SERVICE_SECRET = "svc";
    const withKey = (qs: string) =>
      runRoute(
        getSchema(req(qs, { "x-service-key": "svc" })).pipe(
          Effect.provide(Layer.merge(docsByCollection, testNoAuth)),
        ),
      );
    expect((await withKey("")).status).toBe(400);
    expect((await withKey("?dbName=labdb")).status).toBe(200);
  });
});

/** @jest-environment node */

import { Effect, Layer } from "effect";
import { ObjectId } from "mongodb";
import { runRoute, testMongo, testAuth, testNoAuth } from "@/lib/effect";
import { getExperiment } from "@/app/api/experiment/[id]/route";

const id = new ObjectId().toHexString();
const req = (path: string) => new Request(`http://x/api/experiment/${path}`);

const mongoWith = (doc: Record<string, unknown> | null) =>
  testMongo({
    collection: () =>
      Effect.succeed({ findOne: () => Promise.resolve(doc) } as never),
  });

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("GET /api/experiment/[id]", () => {
  test("returns the experiment without heavy fields by default", async () => {
    const layer = Layer.merge(mongoWith({ _id: id, name: "T1" }), testAuth({ sub: "u1" }));
    const res = await runRoute(getExperiment(req(id)).pipe(Effect.provide(layer)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ name: "T1" });
  });

  test("maps originalData onto rawdata when asked", async () => {
    const layer = Layer.merge(
      mongoWith({ _id: id, data: [1], originalData: [9] }),
      testAuth({ sub: "u1" }),
    );
    const res = await runRoute(
      getExperiment(req(`${id}?includeRawData=true&includeOriginalData=true`)).pipe(Effect.provide(layer)),
    );
    const body = await res.json();
    expect(body.rawdata).toEqual([9]);
    expect(body.isOriginalData).toBe(true);
  });

  test("400 for a non-ObjectId id", async () => {
    const layer = Layer.merge(mongoWith(null), testAuth({ sub: "u1" }));
    const res = await runRoute(getExperiment(req("not-an-id")).pipe(Effect.provide(layer)));
    expect(res.status).toBe(400);
  });

  test("404 when the experiment is missing", async () => {
    const layer = Layer.merge(mongoWith(null), testAuth({ sub: "u1" }));
    const res = await runRoute(getExperiment(req(id)).pipe(Effect.provide(layer)));
    expect(res.status).toBe(404);
  });

  test("401 without a session", async () => {
    const layer = Layer.merge(mongoWith(null), testNoAuth);
    const res = await runRoute(getExperiment(req(id)).pipe(Effect.provide(layer)));
    expect(res.status).toBe(401);
  });
});

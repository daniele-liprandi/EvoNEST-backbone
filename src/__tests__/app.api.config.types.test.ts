/** @jest-environment node */

import { Effect, Layer } from "effect";
import { runRoute, testMongo, testAuth, testNoAuth } from "@/lib/effect";
import { listConfig, handleConfigPost, deleteConfig } from "@/app/api/config/types/handlers";

const req = (method: string, body?: unknown, qs = "") =>
  new Request(`http://x/api/config/types${qs}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const ok1 = () => Effect.succeed({ modifiedCount: 1 } as never);
// Admin short-circuits the capability check, so writes need no permission stubs.
const admin = testAuth({ sub: "u1", name: "Ada", role: "admin" });

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("GET /api/config/types", () => {
  test("returns one document when type is given", async () => {
    const layer = Layer.merge(
      testMongo({ findOne: () => Effect.succeed({ type: "sampletypes", data: [] }) }),
      testAuth({ sub: "u1" }),
    );
    const res = await runRoute(listConfig(req("GET", undefined, "?type=sampletypes")).pipe(Effect.provide(layer)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ type: "sampletypes" });
  });

  test("401 without a session", async () => {
    const res = await runRoute(listConfig(req("GET")).pipe(Effect.provide(Layer.merge(testMongo(), testNoAuth))));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/config/types", () => {
  test("additem upserts and stamps the editor", async () => {
    const updateOne = jest.fn(ok1);
    const layer = Layer.merge(testMongo({ updateOne }), admin);
    const res = await runRoute(
      handleConfigPost(req("POST", { method: "additem", type: "traitquantities", item: { value: "x" } })).pipe(
        Effect.provide(layer),
      ),
    );
    expect(res.status).toBe(200);
    const [, , , update, options] = updateOne.mock.calls[0] as unknown[];
    expect(options).toMatchObject({ upsert: true });
    expect((update as { $set: { modifiedBy: string } }).$set.modifiedBy).toBe("Ada");
  });

  test("updateitem 404 when nothing matched", async () => {
    const layer = Layer.merge(
      testMongo({ updateOne: () => Effect.succeed({ modifiedCount: 0 } as never) }),
      admin,
    );
    const res = await runRoute(
      handleConfigPost(
        req("POST", { method: "updateitem", type: "t", oldValue: "a", item: { value: "b" } }),
      ).pipe(Effect.provide(layer)),
    );
    expect(res.status).toBe(404);
  });

  test("seed is a no-op when the type already exists", async () => {
    const insertOne = jest.fn();
    const layer = Layer.merge(
      testMongo({ findOne: () => Effect.succeed({ type: "t" }), insertOne }),
      admin,
    );
    const res = await runRoute(
      handleConfigPost(req("POST", { method: "seed", type: "t", data: [] })).pipe(Effect.provide(layer)),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ message: "Configuration already exists" });
    expect(insertOne).not.toHaveBeenCalled();
  });

  test("400 for an unknown method", async () => {
    const res = await runRoute(
      handleConfigPost(req("POST", { method: "drop", type: "t" })).pipe(Effect.provide(Layer.merge(testMongo(), admin))),
    );
    expect(res.status).toBe(400);
  });

  test("403 for a role without config.edit", async () => {
    const mongo = testMongo({ findOne: () => Effect.succeed({ _id: "admin" }) });
    const res = await runRoute(
      handleConfigPost(req("POST", { method: "additem", type: "t", item: {} })).pipe(
        Effect.provide(Layer.merge(mongo, testAuth({ sub: "u1", role: "viewer" }))),
      ),
    );
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/config/types", () => {
  test("pulls one item when value is given", async () => {
    const updateOne = jest.fn(ok1);
    const deleteOne = jest.fn();
    const layer = Layer.merge(testMongo({ updateOne, deleteOne }), admin);
    const res = await runRoute(deleteConfig(req("DELETE", { type: "t", value: "x" })).pipe(Effect.provide(layer)));
    expect(res.status).toBe(200);
    expect(updateOne).toHaveBeenCalled();
    expect(deleteOne).not.toHaveBeenCalled();
  });

  test("deletes the whole type when no value is given", async () => {
    const updateOne = jest.fn();
    const deleteOne = jest.fn(() => Effect.succeed({ deletedCount: 1 } as never));
    const layer = Layer.merge(testMongo({ updateOne, deleteOne }), admin);
    const res = await runRoute(deleteConfig(req("DELETE", { type: "t" })).pipe(Effect.provide(layer)));
    expect(res.status).toBe(200);
    expect(deleteOne).toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  test("403 for a role without config.edit", async () => {
    const mongo = testMongo({ findOne: () => Effect.succeed({ _id: "admin" }) });
    const res = await runRoute(
      deleteConfig(req("DELETE", { type: "t" })).pipe(
        Effect.provide(Layer.merge(mongo, testAuth({ sub: "u1", role: "viewer" }))),
      ),
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /api/config/types, protocols", () => {
  const post = (body: unknown, mongo: Parameters<typeof testMongo>[0] = {}) =>
    runRoute(handleConfigPost(req("POST", body)).pipe(Effect.provide(Layer.merge(testMongo({ updateOne: ok1, ...mongo }), admin))));
  const valid = {
    value: "weigh",
    label: "Weigh",
    appliesToSampleTypes: [],
    steps: [{ key: "weigh", label: "Weigh", kind: "measurement", params: [], equipmentTypes: [], optional: false, repeatable: false, technique: null, expectedQuantities: ["mass"] }],
  };

  test("a valid protocol is stored", async () => {
    expect((await post({ method: "update", type: "protocols", data: [valid] })).status).toBe(200);
  });

  test("an unknown technique is refused with 400", async () => {
    const bad = { ...valid, steps: [{ ...valid.steps[0], technique: "x_ray" }] };
    const res = await post({ method: "update", type: "protocols", data: [bad] });
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).toMatch(/unknown technique \\"x_ray\\"/);
  });

  test("additem checks the list it would produce", async () => {
    const findOne = () => Effect.succeed({ type: "protocols", data: [valid] } as never);
    expect((await post({ method: "additem", type: "protocols", item: valid }, { findOne })).status).toBe(400);
    expect((await post({ method: "additem", type: "protocols", item: { ...valid, value: "weigh_again" } }, { findOne })).status).toBe(200);
  });
});

/** @jest-environment node */

import { Effect, Layer } from "effect";
import { runRoute, testMongo, testAuth, testNoAuth } from "@/lib/effect";
import { getUserDatabases, setActiveDatabase } from "@/app/api/user/database/route";

const withUser = (user: Record<string, unknown> | null, updateOne = jest.fn()) => ({
  updateOne,
  layer: testMongo({
    findOne: () => Effect.succeed(user),
    updateOne: (...args: unknown[]) => Effect.sync(() => updateOne(...args) ?? ({} as never)),
  }),
});

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("GET /api/user/database", () => {
  test("returns the user's databases", async () => {
    const { layer } = withUser({ databases: ["a", "b"], activeDatabase: "a" });
    const res = await runRoute(
      getUserDatabases.pipe(Effect.provide(Layer.merge(layer, testAuth({ sub: "u1" })))),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ databases: ["a", "b"], activeDatabase: "a" });
  });

  test("401 without a session", async () => {
    const { layer } = withUser({});
    const res = await runRoute(getUserDatabases.pipe(Effect.provide(Layer.merge(layer, testNoAuth))));
    expect(res.status).toBe(401);
  });

  test("404 when the user record is missing", async () => {
    const { layer } = withUser(null);
    const res = await runRoute(getUserDatabases.pipe(Effect.provide(Layer.merge(layer, testAuth({ sub: "u1" })))));
    expect(res.status).toBe(404);
  });

  test("500 without leaking the driver error", async () => {
    const layer = testMongo({
      findOne: () => Effect.die(new Error("connection refused to internal host")),
    });
    const res = await runRoute(getUserDatabases.pipe(Effect.provide(Layer.merge(layer, testAuth({ sub: "u1" })))));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("connection refused");
  });
});

describe("POST /api/user/database", () => {
  const req = (body: unknown) =>
    new Request("http://x/api/user/database", { method: "POST", body: JSON.stringify(body) });

  test("switches the active database", async () => {
    const { updateOne, layer } = withUser({ databases: ["a", "b"] });
    const res = await runRoute(
      setActiveDatabase(req({ database: "b" })).pipe(Effect.provide(Layer.merge(layer, testAuth({ sub: "u1" })))),
    );
    expect(res.status).toBe(200);
    expect(updateOne).toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({ success: true, activeDatabase: "b" });
  });

  test("403 for a database the user cannot access", async () => {
    const { updateOne, layer } = withUser({ databases: ["a"] });
    const res = await runRoute(
      setActiveDatabase(req({ database: "z" })).pipe(Effect.provide(Layer.merge(layer, testAuth({ sub: "u1" })))),
    );
    expect(res.status).toBe(403);
    expect(updateOne).not.toHaveBeenCalled();
  });

  test("400 for a missing database field", async () => {
    const { layer } = withUser({ databases: ["a"] });
    const res = await runRoute(
      setActiveDatabase(req({})).pipe(Effect.provide(Layer.merge(layer, testAuth({ sub: "u1" })))),
    );
    expect(res.status).toBe(400);
  });

  test("400 for a non-JSON body", async () => {
    const { layer } = withUser({ databases: ["a"] });
    const bad = new Request("http://x", { method: "POST", body: "{ oops" });
    const res = await runRoute(
      setActiveDatabase(bad).pipe(Effect.provide(Layer.merge(layer, testAuth({ sub: "u1" })))),
    );
    expect(res.status).toBe(400);
  });
});

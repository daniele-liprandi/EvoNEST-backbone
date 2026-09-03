/** @jest-environment node */

import { Effect, Layer } from "effect";
import { runRoute, ok, userCan, requireCapability, userCapabilities, testMongo, testAuth } from "@/lib/effect";

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

// `findOne` answers both lookups the permission code makes: the admin-existence
// check ({ role: "admin" }) and the permission map ({ type: "permissions" }).
const mongo = (opts: { hasAdmin?: boolean; permissions?: unknown[] | null } = {}) => {
  const { hasAdmin = true, permissions = null } = opts;
  return testMongo({
    findOne: (_db, _coll, filter) => {
      if ((filter as Record<string, unknown>).role === "admin") {
        return Effect.succeed(hasAdmin ? { _id: "admin" } : null);
      }
      if ((filter as Record<string, unknown>).type === "permissions") {
        return Effect.succeed(permissions ? { type: "permissions", data: permissions } : null);
      }
      return Effect.succeed(null);
    },
  });
};

const withLayers = <A, E>(effect: Effect.Effect<A, E, never>) => Effect.runPromise(effect);

describe("userCan", () => {
  test("admin passes every capability without touching the database", async () => {
    const res = await withLayers(
      userCan("anything").pipe(Effect.provide(Layer.merge(testMongo(), testAuth({ sub: "u", role: "admin" })))),
    );
    expect(res).toBe(true);
  });

  test("a non-admin passes only its granted capabilities", async () => {
    const layer = Layer.merge(
      mongo({
        permissions: [
          { value: "config.edit", roles: ["researcher"] },
          { value: "users.manage", roles: [] },
        ],
      }),
      testAuth({ sub: "u", role: "researcher" }),
    );
    expect(await withLayers(userCan("config.edit").pipe(Effect.provide(layer)))).toBe(true);
    expect(await withLayers(userCan("users.manage").pipe(Effect.provide(layer)))).toBe(false);
  });

  test("falls back to the shipped defaults when the map is not seeded", async () => {
    const layer = Layer.merge(mongo({ permissions: null }), testAuth({ sub: "u", role: "researcher" }));
    expect(await withLayers(userCan("samples.delete").pipe(Effect.provide(layer)))).toBe(true);
    expect(await withLayers(userCan("config.seed").pipe(Effect.provide(layer)))).toBe(false);
  });

  test("first-admin bootstrap: everyone passes until an admin exists", async () => {
    const layer = Layer.merge(mongo({ hasAdmin: false, permissions: [] }), testAuth({ sub: "u", role: "viewer" }));
    expect(await withLayers(userCan("users.manage").pipe(Effect.provide(layer)))).toBe(true);
  });

  test("bootstrap stops once an admin exists", async () => {
    const layer = Layer.merge(mongo({ hasAdmin: true, permissions: [] }), testAuth({ sub: "u", role: "viewer" }));
    expect(await withLayers(userCan("users.manage").pipe(Effect.provide(layer)))).toBe(false);
  });
});

describe("requireCapability", () => {
  const effect = (cap: string) => requireCapability(cap).pipe(Effect.flatMap(() => ok({ ok: true })));

  test("403 when the capability is missing", async () => {
    const layer = Layer.merge(mongo({ permissions: [] }), testAuth({ sub: "u", role: "viewer" }));
    const res = await runRoute(effect("config.edit").pipe(Effect.provide(layer)));
    expect(res.status).toBe(403);
  });

  test("passes through for an admin", async () => {
    const layer = Layer.merge(testMongo(), testAuth({ sub: "u", role: "admin" }));
    const res = await runRoute(effect("config.edit").pipe(Effect.provide(layer)));
    expect(res.status).toBe(200);
  });
});

describe("userCapabilities", () => {
  test("lists exactly the capabilities the role holds", async () => {
    const layer = Layer.merge(
      mongo({
        permissions: [
          { value: "samples.delete", roles: ["researcher"] },
          { value: "traits.delete", roles: ["researcher"] },
          { value: "config.edit", roles: ["labManager"] },
        ],
      }),
      testAuth({ sub: "u", role: "researcher" }),
    );
    expect(await withLayers(userCapabilities.pipe(Effect.provide(layer)))).toEqual([
      "samples.delete",
      "traits.delete",
    ]);
  });

  test("admin gets the full list", async () => {
    const layer = Layer.merge(
      mongo({
        permissions: [
          { value: "a", roles: [] },
          { value: "b", roles: [] },
        ],
      }),
      testAuth({ sub: "u", role: "admin" }),
    );
    expect(await withLayers(userCapabilities.pipe(Effect.provide(layer)))).toEqual(["a", "b"]);
  });
});

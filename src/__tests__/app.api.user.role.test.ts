/** @jest-environment node */

import { Effect, Layer } from "effect";
import { runRoute, testMongo, testAuth, testNoAuth } from "@/lib/effect";
import { getUserRole } from "@/app/api/user/role/handlers";

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

// An admin exists and the permission map is the seeded one.
const mongo = testMongo({
  findOne: (_db, _coll, filter) =>
    Effect.succeed((filter as Record<string, unknown>).role === "admin" ? { _id: "admin" } : null),
});

describe("GET /api/user/role", () => {
  test("admin: isAdmin true, role admin, every capability", async () => {
    const res = await runRoute(
      getUserRole.pipe(Effect.provide(Layer.merge(mongo, testAuth({ sub: "u1", role: "admin" })))),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isAdmin).toBe(true);
    expect(body.role).toBe("admin");
    expect(body.capabilities).toEqual(expect.arrayContaining(["samples.delete", "config.edit"]));
  });

  test("non-admin: isAdmin false and only the role's capabilities", async () => {
    const res = await runRoute(
      getUserRole.pipe(Effect.provide(Layer.merge(mongo, testAuth({ sub: "u1", role: "student" })))),
    );
    const body = await res.json();
    expect(body).toMatchObject({ role: "student", isAdmin: false });
    expect(body.capabilities).toContain("samples.delete");
    expect(body.capabilities).not.toContain("config.edit");
  });

  test("401 when not authenticated", async () => {
    const res = await runRoute(getUserRole.pipe(Effect.provide(Layer.merge(mongo, testNoAuth))));
    expect(res.status).toBe(401);
  });
});

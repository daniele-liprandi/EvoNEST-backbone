/** @jest-environment node */

import { Effect } from "effect";
import { runRoute, testAuth, testNoAuth } from "@/lib/effect";
import { checkAdmin } from "@/app/api/user/role/route";

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("GET /api/user/role", () => {
  test("isAdmin true for an admin", async () => {
    const res = await runRoute(checkAdmin.pipe(Effect.provide(testAuth({ sub: "u1", role: "admin" }))));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ isAdmin: true });
  });

  test("isAdmin false for a non-admin", async () => {
    const res = await runRoute(checkAdmin.pipe(Effect.provide(testAuth({ sub: "u1", role: "user" }))));
    await expect(res.json()).resolves.toEqual({ isAdmin: false });
  });

  test("401 when not authenticated", async () => {
    const res = await runRoute(checkAdmin.pipe(Effect.provide(testNoAuth)));
    expect(res.status).toBe(401);
  });
});

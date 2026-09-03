/** @jest-environment node */

import { Effect, Layer } from "effect";
import { runRoute, testMongo, testAuth, testNoAuth } from "@/lib/effect";
import { getUserControl } from "@/app/api/auth/usercontrol/handlers";

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("GET /api/auth/usercontrol", () => {
  test("returns the db user when the account is linked", async () => {
    const layer = Layer.merge(
      testMongo({ findOne: () => Effect.succeed({ auth0id: "auth0|1", name: "Ada" }) }),
      testAuth({ sub: "auth0|1", name: "Ada" }),
    );
    const res = await runRoute(getUserControl.pipe(Effect.provide(layer)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ needsIdentification: false, dbuser: { name: "Ada" } });
  });

  test("flags needsIdentification when there is no db user", async () => {
    const layer = Layer.merge(testMongo({ findOne: () => Effect.succeed(null) }), testAuth({ sub: "auth0|1" }));
    const res = await runRoute(getUserControl.pipe(Effect.provide(layer)));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.needsIdentification).toBe(true);
    expect(body.dbuser).toBeUndefined();
  });

  test("401 without a session", async () => {
    const layer = Layer.merge(testMongo(), testNoAuth);
    const res = await runRoute(getUserControl.pipe(Effect.provide(layer)));
    expect(res.status).toBe(401);
  });
});

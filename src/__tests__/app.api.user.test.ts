/** @jest-environment node */

import { Effect, Layer } from "effect";
import { runRoute, testMongo, testAuth, testNoAuth } from "@/lib/effect";
import { getUser, updateUser } from "@/app/api/user/handlers";

const req = (body: unknown) =>
  new Request("http://x/api/user", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("GET /api/user", () => {
  test("returns the user record", async () => {
    const layer = Layer.merge(
      testMongo({ findOne: () => Effect.succeed({ auth0id: "u1", email: "a@b.c" }) }),
      testAuth({ sub: "u1" }),
    );
    const res = await runRoute(getUser.pipe(Effect.provide(layer)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ email: "a@b.c" });
  });

  test("401 without a session", async () => {
    const layer = Layer.merge(testMongo(), testNoAuth);
    const res = await runRoute(getUser.pipe(Effect.provide(layer)));
    expect(res.status).toBe(401);
  });

  test("404 when the user record is missing", async () => {
    const layer = Layer.merge(testMongo({ findOne: () => Effect.succeed(null) }), testAuth({ sub: "u1" }));
    const res = await runRoute(getUser.pipe(Effect.provide(layer)));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/user", () => {
  test("updates an editable field", async () => {
    const updateOne = jest.fn(() => Effect.succeed({ matchedCount: 1 } as never));
    const layer = Layer.merge(testMongo({ updateOne }), testAuth({ sub: "u1" }));
    const res = await runRoute(
      updateUser(req({ method: "setfield", field: "email", value: "new@b.c" })).pipe(Effect.provide(layer)),
    );
    expect(res.status).toBe(200);
    expect(updateOne).toHaveBeenCalled();
  });

  test("400 for a field that is not self-service", async () => {
    const updateOne = jest.fn();
    const layer = Layer.merge(testMongo({ updateOne }), testAuth({ sub: "u1" }));
    const res = await runRoute(
      updateUser(req({ method: "setfield", field: "role", value: "admin" })).pipe(Effect.provide(layer)),
    );
    expect(res.status).toBe(400);
    expect(updateOne).not.toHaveBeenCalled();
  });

  test("400 for an unknown method", async () => {
    const layer = Layer.merge(testMongo(), testAuth({ sub: "u1" }));
    const res = await runRoute(
      updateUser(req({ method: "drop", field: "email", value: "x" })).pipe(Effect.provide(layer)),
    );
    expect(res.status).toBe(400);
  });

  test("404 when the user record is missing", async () => {
    const layer = Layer.merge(
      testMongo({ updateOne: () => Effect.succeed({ matchedCount: 0 } as never) }),
      testAuth({ sub: "u1" }),
    );
    const res = await runRoute(
      updateUser(req({ method: "setfield", field: "name", value: "X" })).pipe(Effect.provide(layer)),
    );
    expect(res.status).toBe(404);
  });
});

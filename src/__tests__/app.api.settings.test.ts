/** @jest-environment node */

import { Effect, Layer } from "effect";
import { runRoute, testMongo, testAuth, testNoAuth } from "@/lib/effect";
import { getSettings, updateSettings } from "@/app/api/settings/handlers";

const validBody = {
  idGeneration: {
    combinations: [[3, 3], [4, 4]],
    defaultGenusLength: 3,
    defaultSpeciesLength: 3,
    startingNumber: 1,
    useCollisionAvoidance: true,
    numberPadding: 0,
  },
  labInfo: { name: "Web Lab", location: "Berlin", latitude: 52.5, longitude: 13.4 },
};

const req = (body: unknown) =>
  new Request("http://x/api/settings", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("GET /api/settings", () => {
  test("returns stored settings", async () => {
    const layer = Layer.merge(
      testMongo({ findOne: () => Effect.succeed({ type: "main", idGeneration: { startingNumber: 5 }, labInfo: { name: "L" } }) }),
      testAuth({ sub: "u1" }),
    );
    const res = await runRoute(getSettings.pipe(Effect.provide(layer)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true, data: { idGeneration: { startingNumber: 5 } } });
  });

  test("returns defaults when none are stored", async () => {
    const layer = Layer.merge(testMongo({ findOne: () => Effect.succeed(null) }), testAuth({ sub: "u1" }));
    const res = await runRoute(getSettings.pipe(Effect.provide(layer)));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ data: { idGeneration: { defaultGenusLength: 3 } } });
  });

  test("401 without a session", async () => {
    const layer = Layer.merge(testMongo(), testNoAuth);
    const res = await runRoute(getSettings.pipe(Effect.provide(layer)));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/settings", () => {
  test("upserts the settings document", async () => {
    const updateOne = jest.fn(() => Effect.succeed({ acknowledged: true, modifiedCount: 1, upsertedCount: 0 } as never));
    const layer = Layer.merge(testMongo({ updateOne }), testAuth({ sub: "u1", name: "Ada" }));
    const res = await runRoute(updateSettings(req(validBody)).pipe(Effect.provide(layer)));
    expect(res.status).toBe(200);
    const [, , filter, update, options] = updateOne.mock.calls[0] as unknown[];
    expect(filter).toEqual({ type: "main" });
    expect(options).toMatchObject({ upsert: true });
    expect((update as { $set: { modifiedBy: string } }).$set.modifiedBy).toBe("Ada");
  });

  test("400 when labInfo.name is empty", async () => {
    const updateOne = jest.fn();
    const layer = Layer.merge(testMongo({ updateOne }), testAuth({ sub: "u1" }));
    const res = await runRoute(
      updateSettings(req({ ...validBody, labInfo: { ...validBody.labInfo, name: "" } })).pipe(Effect.provide(layer)),
    );
    expect(res.status).toBe(400);
    expect(updateOne).not.toHaveBeenCalled();
  });

  test("400 when combinations is empty", async () => {
    const layer = Layer.merge(testMongo(), testAuth({ sub: "u1" }));
    const res = await runRoute(
      updateSettings(req({ ...validBody, idGeneration: { ...validBody.idGeneration, combinations: [] } })).pipe(
        Effect.provide(layer),
      ),
    );
    expect(res.status).toBe(400);
  });

  test("401 without a session", async () => {
    const layer = Layer.merge(testMongo(), testNoAuth);
    const res = await runRoute(updateSettings(req(validBody)).pipe(Effect.provide(layer)));
    expect(res.status).toBe(401);
  });
});

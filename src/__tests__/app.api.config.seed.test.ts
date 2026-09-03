/** @jest-environment node */

import { Effect, Layer } from "effect";
import { runRoute, testMongo, testAuth } from "@/lib/effect";
import { seedConfigs } from "@/app/api/config/types/seed/handlers";

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const admin = testAuth({ sub: "u1", name: "Ada", role: "admin" });

const mongoWith = (over: Record<string, jest.Mock> = {}) => {
  const replaceOne = over.replaceOne ?? jest.fn().mockResolvedValue({ upsertedCount: 1 });
  const updateOne = over.updateOne ?? jest.fn().mockResolvedValue({});
  return {
    replaceOne,
    updateOne,
    layer: testMongo({
      collection: () => Effect.succeed({ replaceOne } as never),
      updateOne: (...a: unknown[]) => Effect.sync(() => updateOne(...a)),
    }),
  };
};

const post = (body?: unknown) =>
  new Request("http://x/api/config/types/seed", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe("POST /api/config/types/seed", () => {
  test("no body seeds every default config type", async () => {
    const { replaceOne, layer } = mongoWith();
    const res = await runRoute(seedConfigs(post()).pipe(Effect.provide(Layer.merge(layer, admin))));
    expect(res.status).toBe(200);
    const seeded = replaceOne.mock.calls.map((c) => c[0].type);
    expect(seeded).toEqual(expect.arrayContaining(["sampletypes", "traittypes", "baseunits"]));
  });

  test("a preset overrides the types it names and keeps the rest", async () => {
    const { replaceOne, layer } = mongoWith();
    const res = await runRoute(
      seedConfigs(post({ preset: "silk-biomechanics" })).pipe(Effect.provide(Layer.merge(layer, admin))),
    );
    expect(res.status).toBe(200);
    const byType = Object.fromEntries(replaceOne.mock.calls.map((c) => [c[0].type, c[1].data]));
    expect(byType.sampletypes.map((s: { value: string }) => s.value)).toContain("silk");
    expect(byType.siprefixes.length).toBeGreaterThan(0);
  });

  test("an unknown preset is a 400 and nothing is written", async () => {
    const { replaceOne, layer } = mongoWith();
    const res = await runRoute(
      seedConfigs(post({ preset: "does-not-exist" })).pipe(Effect.provide(Layer.merge(layer, admin))),
    );
    expect(res.status).toBe(400);
    expect(replaceOne).not.toHaveBeenCalled();
  });

  test("403 for a role without config.seed", async () => {
    const mongo = testMongo({ findOne: () => Effect.succeed({ _id: "admin" }) });
    const res = await runRoute(
      seedConfigs(post({ preset: "generic" })).pipe(
        Effect.provide(Layer.merge(mongo, testAuth({ sub: "u1", role: "researcher" }))),
      ),
    );
    expect(res.status).toBe(403);
  });

  test("the lab name and description are written to the main settings", async () => {
    const { updateOne, layer } = mongoWith();
    await runRoute(
      seedConfigs(post({ preset: "generic", labName: "Silk Lab", labDescription: "we study silk" })).pipe(
        Effect.provide(Layer.merge(layer, admin)),
      ),
    );
    expect(updateOne).toHaveBeenCalledWith(
      "testdb",
      "settings",
      { type: "main" },
      { $set: { type: "main", "labInfo.name": "Silk Lab", "labInfo.description": "we study silk" } },
      { upsert: true },
    );
  });

  test("no settings write when the lab fields are absent", async () => {
    const { updateOne, layer } = mongoWith();
    await runRoute(seedConfigs(post({ preset: "generic" })).pipe(Effect.provide(Layer.merge(layer, admin))));
    expect(updateOne).not.toHaveBeenCalled();
  });

  test("500 without leaking the driver error", async () => {
    const { layer } = mongoWith({ replaceOne: jest.fn().mockRejectedValue(new Error("replica set stepped down")) });
    const res = await runRoute(seedConfigs(post()).pipe(Effect.provide(Layer.merge(layer, admin))));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("replica set");
  });
});

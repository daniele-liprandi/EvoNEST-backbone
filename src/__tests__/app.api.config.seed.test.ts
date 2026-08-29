/** @jest-environment node */

jest.mock("@/shared/config/default-types", () => ({
  DEFAULT_CONFIGS: { sampleTypes: { a: 1 }, traitTypes: { b: 2 } },
}));

import { Effect, Layer } from "effect";
import { runRoute, testMongo, testAuth, testNoAuth } from "@/lib/effect";
import { seedConfigs } from "@/app/api/config/types/seed/route";

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const mongoWith = (replaceOne: jest.Mock) =>
  testMongo({ collection: () => Effect.succeed({ replaceOne } as never) });

describe("POST /api/config/types/seed", () => {
  test("upserts every default config and reports the action", async () => {
    const replaceOne = jest
      .fn()
      .mockResolvedValueOnce({ upsertedCount: 1 })
      .mockResolvedValueOnce({ upsertedCount: 0 });

    const res = await runRoute(
      seedConfigs.pipe(Effect.provide(Layer.merge(mongoWith(replaceOne), testAuth({ sub: "u1", name: "Ada" })))),
    );

    expect(res.status).toBe(200);
    expect(replaceOne).toHaveBeenCalledTimes(2);
    const body = await res.json();
    expect(body.results).toEqual([
      { type: "sampleTypes", action: "created" },
      { type: "traitTypes", action: "updated" },
    ]);
  });

  test("401 without a session", async () => {
    const res = await runRoute(
      seedConfigs.pipe(Effect.provide(Layer.merge(mongoWith(jest.fn()), testNoAuth))),
    );
    expect(res.status).toBe(401);
  });

  test("500 without leaking the driver error", async () => {
    const replaceOne = jest.fn().mockRejectedValue(new Error("replica set stepped down"));
    const res = await runRoute(
      seedConfigs.pipe(Effect.provide(Layer.merge(mongoWith(replaceOne), testAuth({ sub: "u1" })))),
    );
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("replica set");
  });
});

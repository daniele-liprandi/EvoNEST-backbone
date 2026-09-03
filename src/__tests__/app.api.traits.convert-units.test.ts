/** @jest-environment node */

import { Effect, Layer } from "effect";
import { ObjectId } from "mongodb";
import { runRoute, testMongo, testAuth, testNoAuth } from "@/lib/effect";
import { convertUnits } from "@/app/api/traits/convert-units/handlers";

jest.mock("@/utils/unitConversion", () => ({
  analyzeTraitConversion: (trait: { unit: string }) =>
    trait.unit === "mm"
      ? { needsConversion: true, newValue: 0.001, newUnit: "m", reason: "prefix" }
      : { needsConversion: false, newValue: null, newUnit: trait.unit, reason: "already default" },
}));

const req = (body?: unknown) =>
  new Request("http://x/api/traits/convert-units", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const config = (type: string) =>
  type === "traittypes" ? { type, data: [] } : { type, data: [] };

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("POST /api/traits/convert-units", () => {
  test("converts the compatible traits and skips the rest", async () => {
    const updateOne = jest.fn(() => Effect.succeed({ modifiedCount: 1 } as never));
    const layer = Layer.merge(
      testMongo({
        findOne: (_db, _c, filter) => Effect.succeed(config((filter as { type: string }).type)),
        find: () =>
          Effect.succeed([
            { _id: new ObjectId(), type: "diameter", measurement: 1, unit: "mm" },
            { _id: new ObjectId(), type: "load", measurement: 2, unit: "N" },
          ]),
        updateOne,
      }),
      testAuth({ sub: "u1" }),
    );
    const res = await runRoute(convertUnits(req()).pipe(Effect.provide(layer)));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ totalTraits: 2, converted: 1, skipped: 1 });
    expect(updateOne).toHaveBeenCalledTimes(1);
  });

  test("500 when the trait type config is missing", async () => {
    const layer = Layer.merge(
      testMongo({ findOne: () => Effect.succeed(null) }),
      testAuth({ sub: "u1" }),
    );
    const res = await runRoute(convertUnits(req()).pipe(Effect.provide(layer)));
    expect(res.status).toBe(500);
  });

  test("401 without a session", async () => {
    const layer = Layer.merge(testMongo(), testNoAuth);
    const res = await runRoute(convertUnits(req()).pipe(Effect.provide(layer)));
    expect(res.status).toBe(401);
  });
});

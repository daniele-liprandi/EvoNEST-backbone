/** @jest-environment node */

jest.mock("@/utils/unitConversion", () => ({
  analyzeTraitConversion: (trait: { value: number }) =>
    trait.value > 0
      ? { needsConversion: true, newValue: trait.value / 1000, newUnit: "m" }
      : { needsConversion: false, newValue: null, newUnit: null },
}));

import { Effect, Layer } from "effect";
import { ObjectId } from "mongodb";
import { runRoute, testMongo, testAuth, testNoAuth } from "@/lib/effect";
import { previewConversion } from "@/app/api/traits/convert-units/preview/handlers";

const req = (body: unknown) =>
  new Request("http://x/api/traits/convert-units/preview", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const configAnd = (traits: unknown[]) =>
  testMongo({
    findOne: (_db, _c, filter) =>
      Effect.succeed(
        ((filter as { type?: string }).type === "traittypes" ? { data: {} } : { data: null }) as never,
      ),
    find: () => Effect.succeed(traits as never[]),
  });

describe("POST /api/traits/convert-units/preview", () => {
  test("counts conversions and caps the preview at 10", async () => {
    const traits = Array.from({ length: 12 }, (_, i) => ({ _id: new ObjectId(), value: i + 1, quantity: "d" }));
    const res = await runRoute(
      previewConversion(req({})).pipe(Effect.provide(Layer.merge(configAnd(traits), testAuth({ sub: "u1" })))),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalTraits).toBe(12);
    expect(body.willConvert).toBe(12);
    expect(body.preview).toHaveLength(10);
  });

  test("400 for an invalid trait id in the body", async () => {
    const res = await runRoute(
      previewConversion(req({ traitIds: ["not-an-objectid"] })).pipe(
        Effect.provide(Layer.merge(configAnd([]), testAuth({ sub: "u1" }))),
      ),
    );
    expect(res.status).toBe(400);
  });

  test("401 without a session", async () => {
    const res = await runRoute(
      previewConversion(req({})).pipe(Effect.provide(Layer.merge(configAnd([]), testNoAuth))),
    );
    expect(res.status).toBe(401);
  });

  test("500 when the trait types config is missing", async () => {
    const mongo = testMongo({ findOne: () => Effect.succeed(null), find: () => Effect.succeed([] as never[]) });
    const res = await runRoute(
      previewConversion(req({})).pipe(Effect.provide(Layer.merge(mongo, testAuth({ sub: "u1" })))),
    );
    expect(res.status).toBe(500);
  });
});

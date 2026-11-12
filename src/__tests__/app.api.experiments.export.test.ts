/** @jest-environment node */

jest.mock("@/utils/exporters/json-exporter", () => ({
  exportExperimentsToStructuredFormat: (rows: unknown[]) => ({ count: rows.length }),
}));

import { Effect, Layer } from "effect";
import { runRoute, testMongo, testAuth, testNoAuth } from "@/lib/effect";
import { exportExperiments } from "@/app/api/experiments/export/handlers";

const req = (qs = "") => new Request(`http://x/api/experiments/export${qs}`);

const mongoWith = (rows: unknown[], seen: unknown[] = []) =>
  testMongo({ find: (_db: unknown, _c: unknown, filter: unknown) => Effect.sync(() => (seen.push(filter), rows as never[])) });

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("GET /api/experiments/export", () => {
  test("returns a JSON attachment of standalone measurements for the technique", async () => {
    const seen: unknown[] = [];
    const res = await runRoute(
      exportExperiments(req("?technique=tensile_test")).pipe(
        Effect.provide(Layer.merge(mongoWith([{ _id: 1 }, { _id: 2 }], seen), testAuth({ sub: "u1" }))),
      ),
    );
    expect(seen).toEqual([{ kind: "measurement", technique: "tensile_test" }]);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toMatch(/attachment; filename="tensile_tests_/);
    await expect(res.json()).resolves.toEqual({ count: 2 });
  });

  test("400 for a non-JSON format, before touching the database", async () => {
    const find = jest.fn();
    const res = await runRoute(
      exportExperiments(req("?format=csv")).pipe(
        Effect.provide(
          Layer.merge(testMongo({ find: (...a: unknown[]) => Effect.sync(() => find(...a)) }), testAuth({ sub: "u1" })),
        ),
      ),
    );
    expect(res.status).toBe(400);
    expect(find).not.toHaveBeenCalled();
  });

  test("404 when there are no experiments", async () => {
    const res = await runRoute(
      exportExperiments(req()).pipe(Effect.provide(Layer.merge(mongoWith([]), testAuth({ sub: "u1" })))),
    );
    expect(res.status).toBe(404);
  });

  test("401 without a session", async () => {
    const res = await runRoute(
      exportExperiments(req()).pipe(Effect.provide(Layer.merge(mongoWith([{ _id: 1 }]), testNoAuth))),
    );
    expect(res.status).toBe(401);
  });
});

/** @jest-environment node */

import { Effect } from "effect";
import { ObjectId } from "mongodb";

import { runRoute, testMongo } from "@/lib/effect";
import { exportSamples } from "@/app/api/samples/ext/handlers";
import { exportTraits } from "@/app/api/traits/ext/handlers";

const KEY = "evo_testkey";
const userDoc = {
  _id: new ObjectId(),
  name: "Tester",
  databases: ["labdb"],
  apiKeys: [{ key: KEY, isActive: true }],
};

function req(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

const authed = { "x-api-key": KEY };

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("export routes: API key auth", () => {
  const run = (handler: (r: Request) => any, request: Request, impl = {}) =>
    runRoute(
      handler(request).pipe(
        Effect.provide(testMongo({ updateOne: () => Effect.succeed({} as never), ...impl })),
      ),
    );

  test("missing ?database= is a 400", async () => {
    const res = await run(exportSamples, req("https://x/api/samples/ext", authed));
    expect(res.status).toBe(400);
  });

  test("missing key is a 401", async () => {
    const res = await run(exportSamples, req("https://x/api/samples/ext?database=labdb"));
    expect(res.status).toBe(401);
  });

  test("a key with no matching user is a 401", async () => {
    const res = await run(exportSamples, req("https://x/api/samples/ext?database=labdb", authed), {
      findOne: () => Effect.succeed(null),
    });
    expect(res.status).toBe(401);
  });

  test("an expired key is a 401", async () => {
    const res = await run(exportSamples, req("https://x/api/samples/ext?database=labdb", authed), {
      findOne: () =>
        Effect.succeed({ ...userDoc, apiKeys: [{ key: KEY, isActive: true, expiresAt: "2000-01-01" }] }),
    });
    expect(res.status).toBe(401);
  });

  test("no samples is a 404", async () => {
    const res = await run(exportSamples, req("https://x/api/samples/ext?database=labdb", authed), {
      findOne: () => Effect.succeed(userDoc),
      find: () => Effect.succeed([]),
    });
    expect(res.status).toBe(404);
  });

  test("a valid key returns the samples and bumps usage stats", async () => {
    const updateOne = jest.fn(() => Effect.succeed({} as never));
    const res = await runRoute(
      exportSamples(req("https://x/api/samples/ext?database=labdb", authed)).pipe(
        Effect.provide(
          testMongo({
            findOne: () => Effect.succeed(userDoc),
            find: () => Effect.succeed([{ _id: new ObjectId(), name: "s1" }]),
            updateOne,
          }),
        ),
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.database).toBe("labdb");
    expect(body.totalSamples).toBe(1);
    expect(res.headers.get("content-disposition")).toContain("samples_labdb_");
    expect(updateOne).toHaveBeenCalledWith(
      "usersdb",
      "users",
      expect.objectContaining({ "apiKeys.key": KEY }),
      expect.objectContaining({ $inc: { "apiKeys.$.usageCount": 1 } }),
    );
  });

  test("traits export derives cross-section rows from diameter traits", async () => {
    const res = await runRoute(
      exportTraits(req("https://x/api/traits/ext?database=labdb", authed)).pipe(
        Effect.provide(
          testMongo({
            findOne: () => Effect.succeed(userDoc),
            find: () =>
              Effect.succeed([{ _id: new ObjectId(), quantity: "diameter", value: 10, nfibres: "2" }]),
            updateOne: () => Effect.succeed({} as never),
          }),
        ),
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.originalTraits).toBe(1);
    expect(body.derivedTraits).toBe(1);
    expect(body.traits.at(-1).quantity).toBe("cross-section");
  });
});

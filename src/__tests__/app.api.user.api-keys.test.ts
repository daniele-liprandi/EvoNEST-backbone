/** @jest-environment node */

import { Effect, Layer } from "effect";
import { ObjectId } from "mongodb";
import { runRoute, testMongo, testAuth, testNoAuth } from "@/lib/effect";
import { listApiKeys, createApiKey, revokeApiKey } from "@/app/api/user/api-keys/route";

const userId = new ObjectId();

const authWith = (apiKeys: unknown[] = []) =>
  testAuth({ sub: "u1", doc: { _id: userId, apiKeys, databases: ["testdb"] } });

const req = (method: string, body: unknown) =>
  new Request("http://x/api/user/api-keys", { method, body: JSON.stringify(body) });

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe("GET /api/user/api-keys", () => {
  test("returns previews and counts, never the full key", async () => {
    const keys = [
      { _id: new ObjectId(), key: "evn_aaaaaaaaaaaa1234", name: "one", isActive: true, createdAt: "", expiresAt: null, lastUsedAt: null },
      { _id: new ObjectId(), key: "evn_bbbbbbbbbbbb5678", name: "two", isActive: false, createdAt: "", expiresAt: null, lastUsedAt: null },
    ];
    const res = await runRoute(listApiKeys.pipe(Effect.provide(authWith(keys))));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ totalKeys: 2, activeKeys: 1 });
    expect(JSON.stringify(body)).not.toContain("evn_aaaaaaaaaaaa1234");
    expect(body.apiKeys[0].keyPreview).toBe("...aaaa1234");
  });

  test("401 without a session", async () => {
    const res = await runRoute(listApiKeys.pipe(Effect.provide(testNoAuth)));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/user/api-keys", () => {
  test("creates a key and returns it once", async () => {
    const updateOne = jest.fn(() => Effect.succeed({ modifiedCount: 1 } as never));
    const layer = Layer.merge(testMongo({ updateOne }), authWith());
    const res = await runRoute(
      createApiKey(req("POST", { name: "ci" })).pipe(Effect.provide(layer)),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.apiKey).toBe("string");
    expect(body.keyId).toBeTruthy();
    expect(updateOne).toHaveBeenCalled();
  });

  test("404 when the user record is gone", async () => {
    const layer = Layer.merge(
      testMongo({ updateOne: () => Effect.succeed({ modifiedCount: 0 } as never) }),
      authWith(),
    );
    const res = await runRoute(createApiKey(req("POST", {})).pipe(Effect.provide(layer)));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/user/api-keys", () => {
  test("revokes by keyId with an array filter", async () => {
    const updateOne = jest.fn(() => Effect.succeed({ modifiedCount: 1 } as never));
    const layer = Layer.merge(testMongo({ updateOne }), authWith());
    const keyId = new ObjectId().toString();
    const res = await runRoute(
      revokeApiKey(req("DELETE", { keyId })).pipe(Effect.provide(layer)),
    );
    expect(res.status).toBe(200);
    const [, , , , options] = updateOne.mock.calls[0] as unknown[];
    expect(options).toMatchObject({ arrayFilters: expect.any(Array) });
  });

  test("400 when neither keyId nor key is given", async () => {
    const layer = Layer.merge(testMongo(), authWith());
    const res = await runRoute(revokeApiKey(req("DELETE", {})).pipe(Effect.provide(layer)));
    expect(res.status).toBe(400);
  });

  test("404 when the key is not found", async () => {
    const layer = Layer.merge(
      testMongo({ updateOne: () => Effect.succeed({ modifiedCount: 0 } as never) }),
      authWith(),
    );
    const res = await runRoute(
      revokeApiKey(req("DELETE", { keyId: new ObjectId().toString() })).pipe(Effect.provide(layer)),
    );
    expect(res.status).toBe(404);
  });
});

/** @jest-environment node */

import { Effect, Layer } from "effect";
import { ObjectId } from "mongodb";
import { runRoute, testMongo, testAuth, testNoAuth } from "@/lib/effect";
import { findSample } from "@/app/api/sample/route";

const req = (body: unknown) =>
  new Request("http://x/api/sample", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const auth = testAuth({ sub: "u1" });

describe("POST /api/sample", () => {
  test("finds by name and returns the document", async () => {
    const findOne = jest.fn().mockReturnValue(Effect.succeed({ name: "S1", type: "animal" }));
    const mongo = testMongo({ findOne });
    const res = await runRoute(findSample(req({ name: "S1" })).pipe(Effect.provide(Layer.merge(mongo, auth))));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ name: "S1", type: "animal" });
    expect(findOne).toHaveBeenCalledWith("testdb", "samples", { name: "S1" });
  });

  test("passes an ObjectId when an id is given", async () => {
    const id = new ObjectId().toHexString();
    const findOne = jest.fn().mockReturnValue(Effect.succeed({ _id: id }));
    const mongo = testMongo({ findOne });
    await runRoute(findSample(req({ id })).pipe(Effect.provide(Layer.merge(mongo, auth))));
    const [, , query] = findOne.mock.calls[0];
    expect(query._id).toBeInstanceOf(ObjectId);
  });

  test("400 when no query field is given", async () => {
    const res = await runRoute(findSample(req({})).pipe(Effect.provide(Layer.merge(testMongo(), auth))));
    expect(res.status).toBe(400);
  });

  test("400 for an invalid id", async () => {
    const res = await runRoute(findSample(req({ id: "nope" })).pipe(Effect.provide(Layer.merge(testMongo(), auth))));
    expect(res.status).toBe(400);
  });

  test("404 when nothing matches", async () => {
    const mongo = testMongo({ findOne: () => Effect.succeed(null) });
    const res = await runRoute(findSample(req({ name: "x" })).pipe(Effect.provide(Layer.merge(mongo, auth))));
    expect(res.status).toBe(404);
  });

  test("401 without a session", async () => {
    const res = await runRoute(findSample(req({ name: "x" })).pipe(Effect.provide(Layer.merge(testMongo(), testNoAuth))));
    expect(res.status).toBe(401);
  });
});

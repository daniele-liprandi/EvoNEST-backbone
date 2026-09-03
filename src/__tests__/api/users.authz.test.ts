/** @jest-environment node */

import { Effect, Layer } from "effect";
import { ObjectId } from "mongodb";
import { runRoute, testMongo, testAuth } from "@/lib/effect";
import { handleUserPost, deleteUser } from "@/app/api/users/handlers";

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const someId = new ObjectId().toHexString();

// A user-manager: admin short-circuits userCan without a DB read.
const manager = testAuth({ sub: "m1", role: "admin" });
// A plain member: an admin exists, and the default map grants users.manage to nobody.
const memberMongo = testMongo({
  findOne: (_d, _c, filter) =>
    Effect.succeed((filter as Record<string, unknown>).role === "admin" ? { _id: "admin" } : null),
  updateOne: () => Effect.succeed({ modifiedCount: 1 } as never),
  deleteOne: () => Effect.succeed({ deletedCount: 1 } as never),
});
const member = (over: Record<string, unknown> = {}) => testAuth({ sub: "u1", role: "student", ...over });

const body = (obj: unknown) =>
  new Request("http://x/api/users", { method: "POST", body: JSON.stringify(obj) });

describe("users route authorization", () => {
  test("a non-manager cannot use method:update", async () => {
    const updateOne = jest.fn(() => Effect.succeed({ modifiedCount: 1 } as never));
    const mongo = testMongo({
      findOne: (_d, _c, f) => Effect.succeed((f as Record<string, unknown>).role === "admin" ? { _id: "a" } : null),
      updateOne,
    });
    const res = await runRoute(
      handleUserPost(body({ method: "update", id: someId, role: "admin" })).pipe(
        Effect.provide(Layer.merge(mongo, member())),
      ),
    );
    expect(res.status).toBe(403);
    expect(updateOne).not.toHaveBeenCalled();
  });

  test("a manager can use method:update", async () => {
    const updateOne = jest.fn(() => Effect.succeed({ modifiedCount: 1 } as never));
    const res = await runRoute(
      handleUserPost(body({ method: "update", id: someId, name: "New name" })).pipe(
        Effect.provide(Layer.merge(testMongo({ updateOne }), manager)),
      ),
    );
    expect(res.status).toBe(200);
    expect(updateOne).toHaveBeenCalled();
  });

  test("a non-manager cannot setfield on another user's record", async () => {
    const res = await runRoute(
      handleUserPost(body({ method: "setfield", id: someId, field: "name", value: "x" })).pipe(
        Effect.provide(Layer.merge(memberMongo, member({ doc: { _id: new ObjectId() } }))),
      ),
    );
    expect(res.status).toBe(403);
  });

  test("a user can setfield on their own record", async () => {
    const res = await runRoute(
      handleUserPost(body({ method: "setfield", id: someId, field: "name", value: "x" })).pipe(
        Effect.provide(Layer.merge(memberMongo, member({ doc: { _id: new ObjectId(someId) } }))),
      ),
    );
    expect(res.status).toBe(200);
  });

  test("setfield still refuses a protected field even for the owner", async () => {
    const res = await runRoute(
      handleUserPost(body({ method: "setfield", id: someId, field: "role", value: "admin" })).pipe(
        Effect.provide(Layer.merge(memberMongo, member({ doc: { _id: new ObjectId(someId) } }))),
      ),
    );
    expect(res.status).toBe(403);
  });

  test("a non-manager cannot DELETE a user", async () => {
    const deleteOne = jest.fn(() => Effect.succeed({ deletedCount: 1 } as never));
    const mongo = testMongo({
      findOne: (_d, _c, f) => Effect.succeed((f as Record<string, unknown>).role === "admin" ? { _id: "a" } : null),
      deleteOne,
    });
    const res = await runRoute(
      deleteUser(body({ id: someId })).pipe(Effect.provide(Layer.merge(mongo, member()))),
    );
    expect(res.status).toBe(403);
    expect(deleteOne).not.toHaveBeenCalled();
  });
});

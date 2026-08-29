/** @jest-environment node */

import { Effect, Layer } from "effect";
import { runRoute, testMongo, testAuth } from "@/lib/effect";
import { listDatabases, addDatabase } from "@/app/api/databases/route";

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const admin = testAuth({ sub: "u1", role: "admin" });
const user = testAuth({ sub: "u2", role: "user" });
const req = (body: unknown) =>
  new Request("http://x/api/databases", { method: "POST", body: JSON.stringify(body) });

describe("GET /api/databases", () => {
  test("returns the stored list", async () => {
    const mongo = testMongo({ findOne: () => Effect.succeed({ databases: ["admin", "evonest", "lab"] }) });
    const res = await runRoute(listDatabases.pipe(Effect.provide(Layer.merge(mongo, admin))));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ databases: ["admin", "evonest", "lab"] });
  });

  test("seeds defaults when the settings doc is missing", async () => {
    const insertOne = jest.fn().mockResolvedValue({});
    const mongo = testMongo({
      findOne: () => Effect.succeed(null),
      insertOne: (...a: unknown[]) => Effect.sync(() => insertOne(...a)),
    });
    const res = await runRoute(listDatabases.pipe(Effect.provide(Layer.merge(mongo, admin))));
    await expect(res.json()).resolves.toEqual({ databases: ["admin", "evonest"] });
    expect(insertOne).toHaveBeenCalled();
  });
});

describe("POST /api/databases", () => {
  test("adds a new database (admin)", async () => {
    const updateOne = jest.fn().mockResolvedValue({});
    const mongo = testMongo({
      findOne: () => Effect.succeed({ databases: ["admin"] }),
      updateOne: (...a: unknown[]) => Effect.sync(() => updateOne(...a)),
    });
    const res = await runRoute(addDatabase(req({ database: "  New_Lab  " })).pipe(Effect.provide(Layer.merge(mongo, admin))));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ message: "Database added successfully", database: "new_lab" });
  });

  test("403 for a non-admin", async () => {
    const mongo = testMongo();
    const res = await runRoute(addDatabase(req({ database: "x" })).pipe(Effect.provide(Layer.merge(mongo, user))));
    expect(res.status).toBe(403);
  });

  test("409 when the database already exists", async () => {
    const mongo = testMongo({ findOne: () => Effect.succeed({ databases: ["admin", "lab"] }) });
    const res = await runRoute(addDatabase(req({ database: "lab" })).pipe(Effect.provide(Layer.merge(mongo, admin))));
    expect(res.status).toBe(409);
  });

  test("400 for an empty name", async () => {
    const mongo = testMongo();
    const res = await runRoute(addDatabase(req({ database: "   " })).pipe(Effect.provide(Layer.merge(mongo, admin))));
    expect(res.status).toBe(400);
  });
});

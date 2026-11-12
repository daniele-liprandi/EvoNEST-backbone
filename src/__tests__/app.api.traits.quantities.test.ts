/** @jest-environment node */

import { Effect } from "effect";
import { runRoute } from "@/lib/effect";
import { setupTestMongo, type TestMongo } from "./helpers/mongo";
import { listStoredQuantities, renameStoredQuantity } from "@/app/api/traits/quantities/handlers";

jest.setTimeout(60_000);

let mongo: TestMongo;

beforeAll(async () => {
  mongo = await setupTestMongo();
  await mongo.seedUser();
});
afterAll(() => mongo.stop());
beforeEach(async () => {
  await mongo.db.collection("traits").deleteMany({});
  await mongo.client.db("usersdb").collection("users").deleteMany({ role: "admin" });
});

const list = () => runRoute(listStoredQuantities.pipe(Effect.provide(mongo.layer)));
const rename = (body: unknown) =>
  runRoute(
    renameStoredQuantity(new Request("http://x/api/traits/quantities", { method: "POST", body: JSON.stringify(body) })).pipe(
      Effect.provide(mongo.layer),
    ),
  );

describe("/api/traits/quantities", () => {
  test("GET counts stored traits per quantity", async () => {
    await mongo.db.collection("traits").insertMany([
      { quantity: "mass", value: 1 },
      { quantity: "mass", value: 2 },
      { quantity: "modulus", value: 9e9 },
      { value: 3 },
    ]);
    expect(await (await list()).json()).toEqual([
      { quantity: "mass", count: 2 },
      { quantity: "modulus", count: 1 },
    ]);
  });

  test("POST moves stored traits to another quantity and logs it", async () => {
    await mongo.db.collection("traits").insertMany([
      { quantity: "modulus", value: 9e9, logbook: [] },
      { quantity: "modulus", value: 8e9, logbook: [] },
      { quantity: "mass", value: 1, logbook: [] },
    ]);
    const res = await rename({ from: "modulus", to: "youngs_modulus" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ renamed: 2 });

    const moved = await mongo.db.collection("traits").find({ quantity: "youngs_modulus" }).toArray();
    expect(moved).toHaveLength(2);
    expect(moved[0].logbook.at(-1)[1]).toMatch(/Quantity changed from modulus to youngs_modulus/);
    expect(await mongo.db.collection("traits").countDocuments({ quantity: "mass" })).toBe(1);
  });

  test("POST rejects identical or missing quantities", async () => {
    expect((await rename({ from: "mass", to: "mass" })).status).toBe(400);
    expect((await rename({ from: "mass" })).status).toBe(400);
  });

  test("POST needs config.edit once an admin exists", async () => {
    await mongo.client.db("usersdb").collection("users").insertOne({ auth0id: "auth0|boss", role: "admin" });
    expect((await rename({ from: "modulus", to: "youngs_modulus" })).status).toBe(403);
  });
});

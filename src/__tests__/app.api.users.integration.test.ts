/** @jest-environment node */

import { Effect, Layer } from "effect";
import { ObjectId } from "mongodb";
import { runRoute, mongoLayer, testAuth } from "@/lib/effect";
import { setupTestMongo, type TestMongo } from "./helpers/mongo";
import { listUsers, handleUserPost, deleteUser } from "@/app/api/users/handlers";

jest.setTimeout(60_000);

let mongo: TestMongo;

const asRole = (role: string, over: Record<string, unknown> = {}) =>
  Layer.merge(
    mongoLayer(mongo.client),
    testAuth({ sub: "auth0|test", name: "T", activeDatabase: mongo.dbName, databases: [mongo.dbName], role, ...over }),
  );

beforeAll(async () => {
  mongo = await setupTestMongo();
});
afterAll(() => mongo.stop());
beforeEach(async () => {
  await mongo.client.db("usersdb").collection("users").deleteMany({});
  await mongo.client.db("systemdb").collection("settings").deleteMany({});
  await mongo.client
    .db("systemdb")
    .collection("settings")
    .insertOne({ type: "databases", databases: ["testdb", "otherdb"] });
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const post = (body: unknown, layer: Layer.Layer<never>) =>
  runRoute(
    handleUserPost(new Request("http://x/api/users", { method: "POST", body: JSON.stringify(body) })).pipe(
      Effect.provide(layer as never),
    ),
  );
const admin = () => asRole("admin");

const seed = async (over: Record<string, unknown> = {}) => {
  const _id = new ObjectId();
  await mongo.client.db("usersdb").collection("users").insertOne({
    _id,
    name: "Seed",
    email: "seed@x.test",
    role: "student",
    databases: ["testdb"],
    activeDatabase: "testdb",
    logbook: [],
    ...over,
  });
  return _id;
};

describe("users — CRUD on the Effect line", () => {
  test("create: a manager adds a user, invalid databases are rejected", async () => {
    const bad = await post({ name: "X", email: "x@x.test", databases: ["nope"] }, admin());
    expect(bad.status).toBe(400);

    const res = await post({ name: "Jane", email: "jane@x.test", role: "researcher", databases: ["testdb"] }, admin());
    expect(res.status).toBe(200);
    const { id } = await res.json();
    const doc = await mongo.client.db("usersdb").collection("users").findOne({ _id: new ObjectId(id) });
    expect(doc?.activeDatabase).toBe("testdb");
    expect(doc?.isActive).toBe(true);
  });

  test("update: a manager sets arbitrary fields; a missing user is 404", async () => {
    const id = await seed();
    const res = await post({ method: "update", id: id.toHexString(), role: "admin", name: "Renamed" }, admin());
    expect(res.status).toBe(200);
    const doc = await mongo.client.db("usersdb").collection("users").findOne({ _id: id });
    expect(doc?.role).toBe("admin");
    expect(doc?.name).toBe("Renamed");

    const missing = await post({ method: "update", id: new ObjectId().toHexString(), name: "x" }, admin());
    expect(missing.status).toBe(404);
  });

  test("setfield: the owner edits a non-protected field; a protected one is 403", async () => {
    const id = await seed();
    const ownerLayer = asRole("student", { doc: { _id: id } });
    expect((await post({ method: "setfield", id: id.toHexString(), field: "institution", value: "MIT" }, ownerLayer)).status).toBe(200);
    expect((await post({ method: "setfield", id: id.toHexString(), field: "role", value: "admin" }, ownerLayer)).status).toBe(403);
    const doc = await mongo.client.db("usersdb").collection("users").findOne({ _id: id });
    expect(doc?.institution).toBe("MIT");
    expect(doc?.role).toBe("student");
  });

  test("change_databases: sets the list and the active database, validates names", async () => {
    const id = await seed();
    expect((await post({ method: "change_databases", id: id.toHexString(), databases: ["ghost"] }, admin())).status).toBe(400);
    const res = await post({ method: "change_databases", id: id.toHexString(), databases: ["otherdb", "testdb"] }, admin());
    expect(res.status).toBe(200);
    const doc = await mongo.client.db("usersdb").collection("users").findOne({ _id: id });
    expect(doc?.databases).toEqual(["otherdb", "testdb"]);
    expect(doc?.activeDatabase).toBe("otherdb");
  });

  test("incrementfield bumps a counter", async () => {
    const id = await seed({ visits: 0 });
    await post({ method: "incrementfield", id: id.toHexString(), field: "visits" }, admin());
    const doc = await mongo.client.db("usersdb").collection("users").findOne({ _id: id });
    expect(doc?.visits).toBe(1);
  });

  test("delete: a manager removes a user; a missing one is 404, a bad id is 400", async () => {
    const id = await seed();
    const del = (uid: string) =>
      runRoute(
        deleteUser(new Request("http://x/api/users", { method: "DELETE", body: JSON.stringify({ id: uid }) })).pipe(
          Effect.provide(admin() as never),
        ),
      );
    expect((await del(id.toHexString())).status).toBe(200);
    expect((await del(id.toHexString())).status).toBe(404);
    expect((await del("nope")).status).toBe(400);
  });

  test("GET: scoped to the active database, or every user with ?auth=true", async () => {
    await seed({ databases: ["testdb"] });
    await seed({ databases: ["otherdb"], email: "other@x.test" });

    const scoped = await runRoute(
      listUsers(new Request("http://x/api/users")).pipe(Effect.provide(admin() as never)),
    );
    expect((await scoped.json()).map((u: { email: string }) => u.email).sort()).toEqual(["seed@x.test"]);

    const all = await runRoute(
      listUsers(new Request("http://x/api/users?auth=true")).pipe(Effect.provide(admin() as never)),
    );
    expect((await all.json())).toHaveLength(2);
  });
});

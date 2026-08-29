import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { Layer } from "effect";
import { Auth, Mongo, mongoLayer, testAuth } from "@/lib/effect";

export interface TestMongo {
  readonly client: MongoClient;
  readonly db: Db;
  readonly dbName: string;
  /** `Mongo` + `Auth` layers wired to this server, for `Effect.provide`. */
  readonly layer: Layer.Layer<Mongo | Auth>;
  readonly seedUser: (overrides?: Record<string, unknown>) => Promise<ObjectId>;
  readonly stop: () => Promise<void>;
}

/**
 * Boot an in-memory MongoDB and hand back a live `Mongo`/`Auth` layer plus the
 * raw client for assertions. Use for tests that exercise real cross-collection
 * behaviour (parent-sample resolution, trait -> sample logbook writes, ...).
 */
export async function setupTestMongo(dbName = "testdb"): Promise<TestMongo> {
  const server = await MongoMemoryServer.create();
  const client = await new MongoClient(server.getUri()).connect();
  const db = client.db(dbName);

  const seedUser = async (overrides: Record<string, unknown> = {}) => {
    const _id = new ObjectId();
    await client.db("usersdb").collection("users").insertOne({
      _id,
      auth0id: "auth0|test",
      name: "Test User",
      role: "user",
      activeDatabase: dbName,
      databases: [dbName],
      ...overrides,
    });
    return _id;
  };

  const layer = Layer.merge(
    mongoLayer(client),
    testAuth({ sub: "auth0|test", name: "Test User", activeDatabase: dbName, databases: [dbName] }),
  );

  return {
    client,
    db,
    dbName,
    layer,
    seedUser,
    stop: async () => {
      await client.close();
      await server.stop();
    },
  };
}

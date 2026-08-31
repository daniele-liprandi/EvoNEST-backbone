/** @jest-environment node */

jest.mock("@/app/api/utils/mongodbClient", () => ({ get_or_create_client: jest.fn() }));
jest.mock("@/app/api/utils/get_database_user", () => ({
  get_database_user: jest.fn().mockResolvedValue("labdb"),
  get_name_authuser: jest.fn().mockResolvedValue("tester"),
}));

import { ObjectId } from "mongodb";
import { POST } from "@/app/api/samples/route";

const { get_or_create_client } = require("@/app/api/utils/mongodbClient");

const idA = new ObjectId();
const idB = new ObjectId();

const DB_SAMPLES = [
  { _id: idA, name: "Aradia1", genus: "Araneus", species: "diadematus", type: "animal" },
  { _id: idB, name: "Aradia2", genus: "Araneus", species: "diadematus", type: "animal" },
  { _id: new ObjectId(), name: "Aramar1", genus: "Araneus", species: "marmoreus", type: "animal" },
];

let bulkWrite: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  bulkWrite = jest.fn().mockResolvedValue({});
  const samplesColl = {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn((filter: any) => ({
      toArray: async () => {
        if (filter?._id?.$in) {
          const wanted = filter._id.$in.map(String);
          return DB_SAMPLES.filter((s) => wanted.includes(String(s._id)));
        }
        return DB_SAMPLES;
      },
    })),
    bulkWrite,
  };
  const settingsColl = { findOne: jest.fn().mockResolvedValue(null) }; // -> DEFAULT_ID_GENERATION
  get_or_create_client.mockResolvedValue({
    db: () => ({
      collection: (name: string) => (name === "settings" ? settingsColl : samplesColl),
    }),
  });
});

const body = (obj: unknown) =>
  new Request("http://x/api/samples", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(obj),
  });

describe("POST /api/samples method:retaxon", () => {
  test("needs ids and taxon changes", async () => {
    const res = await POST(body({ method: "retaxon", ids: [], changes: {} }));
    expect(res.status).toBe(400);
  });

  test("updates the taxon fields without renaming when regenerateNames is false", async () => {
    const res = await POST(body({
      method: "retaxon",
      ids: [String(idA)],
      changes: { species: "marmoreus" },
      regenerateNames: false,
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.renamed).toEqual([]);
    const op = bulkWrite.mock.calls[0][0][0].updateOne;
    expect(op.update.$set.species).toBe("marmoreus");
    expect(op.update.$set.name).toBeUndefined();
  });

  test("regenerates names for the batch when asked", async () => {
    const res = await POST(body({
      method: "retaxon",
      ids: [String(idA), String(idB)],
      changes: { species: "marmoreus" },
      regenerateNames: true,
    }));
    const json = await res.json();
    expect(json.updated).toBe(2);
    const to = json.renamed.map((r: any) => r.to).sort();
    expect(to).toEqual(["Aramar2", "Aramar3"]);
  });
});

/** @jest-environment node */

jest.mock("@/app/api/utils/mongodbClient", () => ({ get_or_create_client: jest.fn() }));
jest.mock("@/app/api/utils/get_database_user", () => ({
  get_database_user: jest.fn().mockResolvedValue("labdb"),
  get_name_authuser: jest.fn().mockResolvedValue("tester"),
}));
jest.mock("@/app/api/utils/permissions", () => ({ userCan: jest.fn().mockResolvedValue(true) }));

import { POST } from "@/app/api/samples/route";

const { get_or_create_client } = require("@/app/api/utils/mongodbClient");

const insertOne = jest.fn().mockResolvedValue({ insertedCount: 1, insertedId: "x" });
const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });

// One configured sample type: `plot` and `season` are admin-defined, `notes` is
// a core field the type must not be able to shadow.
const sampleTypeConfig = {
  type: "sampletypes",
  data: [
    {
      value: "crop",
      label: "Crop",
      fields: [
        "responsible",
        { key: "plot", label: "Plot", kind: "text" },
        { key: "season", label: "Season", kind: "select", options: [] },
        { key: "notes", label: "Notes", kind: "text" },
      ],
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  get_or_create_client.mockResolvedValue({
    db: (name: string) => ({
      collection: (coll: string) => {
        if (name === "usersdb" && coll === "users") {
          return { findOne: jest.fn().mockResolvedValue({ _id: "u1", name: "tester" }) };
        }
        if (coll === "config") {
          return { findOne: jest.fn().mockResolvedValue(sampleTypeConfig) };
        }
        if (coll === "samples") {
          return { findOne: jest.fn().mockResolvedValue(null), insertOne, updateOne };
        }
        return { findOne: jest.fn().mockResolvedValue(null) };
      },
    }),
  });
});

const create = (obj: unknown) =>
  new Request("http://x/api/samples", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method: "create", ...(obj as object) }),
  });

const base = {
  name: "Crop 1",
  nomenclature: "Zea mays",
  type: "crop",
  family: "Poaceae",
  genus: "Zea",
  species: "mays",
  responsible: "u1",
  date: new Date().toISOString(),
};

describe("sample creation with configured custom fields", () => {
  test("writes the type's admin-defined fields from the fields bag", async () => {
    await POST(create({ ...base, fields: { plot: "A3", season: "2026" } }));
    expect(insertOne).toHaveBeenCalled();
    const doc = insertOne.mock.calls[0][0];
    expect(doc.plot).toBe("A3");
    expect(doc.season).toBe("2026");
  });

  test("ignores keys the type has not declared", async () => {
    await POST(create({ ...base, fields: { plot: "A3", secretKey: "nope" } }));
    const doc = insertOne.mock.calls[0][0];
    expect(doc.plot).toBe("A3");
    expect(doc).not.toHaveProperty("secretKey");
  });

  test("a custom field cannot shadow a core column", async () => {
    await POST(create({ ...base, notes: "real note", fields: { notes: "injected" } }));
    const doc = insertOne.mock.calls[0][0];
    expect(doc.notes).toBe("real note");
  });

  test("no fields bag is fine", async () => {
    const res = await POST(create(base));
    expect(res.status).toBe(200);
    expect(insertOne).toHaveBeenCalled();
  });
});

/** @jest-environment node */

jest.mock("@/app/api/utils/mongodbClient", () => ({ get_or_create_client: jest.fn() }));
jest.mock("@/app/api/utils/get_database_user", () => ({
  get_database_user: jest.fn().mockResolvedValue("labdb"),
  get_current_user: jest.fn(),
  get_name_authuser: jest.fn().mockResolvedValue("tester"),
}));
jest.mock("@/app/api/utils/permissions", () => ({ userCan: jest.fn() }));

import { ObjectId } from "mongodb";
import { POST, DELETE } from "@/app/api/users/route";

const { get_or_create_client } = require("@/app/api/utils/mongodbClient");
const { get_current_user } = require("@/app/api/utils/get_database_user");
const { userCan } = require("@/app/api/utils/permissions");

const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
const deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  get_or_create_client.mockResolvedValue({
    db: () => ({ collection: () => ({ updateOne, deleteOne, findOne: jest.fn() }) }),
  });
});

const body = (obj: unknown) =>
  new Request("http://x/api/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(obj),
  });

const someId = new ObjectId().toHexString();

describe("users route authorization", () => {
  test("a non-manager cannot use method:update to set their own role", async () => {
    userCan.mockResolvedValue(false);
    const res = await POST(body({ method: "update", id: someId, role: "admin" }));
    expect(res.status).toBe(403);
    expect(updateOne).not.toHaveBeenCalled();
  });

  test("a manager can use method:update", async () => {
    userCan.mockResolvedValue(true);
    const res = await POST(body({ method: "update", id: someId, name: "New name" }));
    expect(res.status).toBe(200);
    expect(updateOne).toHaveBeenCalled();
  });

  test("a non-manager cannot setfield on another user's record", async () => {
    userCan.mockResolvedValue(false);
    get_current_user.mockResolvedValue({ _id: new ObjectId() });
    const res = await POST(body({ method: "setfield", id: someId, field: "name", value: "x" }));
    expect(res.status).toBe(403);
  });

  test("a user can setfield on their own record", async () => {
    userCan.mockResolvedValue(false);
    get_current_user.mockResolvedValue({ _id: new ObjectId(someId) });
    const res = await POST(body({ method: "setfield", id: someId, field: "name", value: "x" }));
    expect(res.status).toBe(200);
  });

  test("setfield still refuses a protected field even for the owner", async () => {
    userCan.mockResolvedValue(false);
    get_current_user.mockResolvedValue({ _id: new ObjectId(someId) });
    const res = await POST(body({ method: "setfield", id: someId, field: "role", value: "admin" }));
    expect(res.status).toBe(403);
  });

  test("a non-manager cannot DELETE a user", async () => {
    userCan.mockResolvedValue(false);
    const res = await DELETE(body({ id: someId }));
    expect(res.status).toBe(403);
    expect(deleteOne).not.toHaveBeenCalled();
  });
});

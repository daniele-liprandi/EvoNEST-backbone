/** @jest-environment node */

// The samples and traits DELETE routes are on the Effect line; their delete
// gate is covered by the *.integration tests. This file covers the one route
// still on the callback stack: experiments.

jest.mock("@/app/api/utils/mongodbClient", () => ({ get_or_create_client: jest.fn() }));
jest.mock("@/app/api/utils/get_database_user", () => ({
  get_database_user: jest.fn().mockResolvedValue("labdb"),
  get_current_user: jest.fn(),
  get_name_authuser: jest.fn().mockResolvedValue("tester"),
}));
jest.mock("@/app/api/utils/permissions", () => ({ userCan: jest.fn() }));

import { ObjectId } from "mongodb";
import { DELETE as deleteExperiment } from "@/app/api/experiments/route";

const { get_or_create_client } = require("@/app/api/utils/mongodbClient");
const { userCan } = require("@/app/api/utils/permissions");

const deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
const findOne = jest.fn().mockResolvedValue({ _id: new ObjectId(), fileId: null });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  deleteOne.mockResolvedValue({ deletedCount: 1 });
  findOne.mockResolvedValue({ _id: new ObjectId(), fileId: null });
  get_or_create_client.mockResolvedValue({
    db: () => ({ collection: () => ({ deleteOne, findOne, insertOne: jest.fn() }) }),
  });
});

const req = (id: string) =>
  new Request("http://x/api/experiments", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });

const id = new ObjectId().toHexString();

describe("experiments DELETE permission gate", () => {
  test("a role without experiments.delete is refused with 403 and nothing is deleted", async () => {
    userCan.mockResolvedValue(false);
    const res = await deleteExperiment(req(id));
    expect(res.status).toBe(403);
    expect(deleteOne).not.toHaveBeenCalled();
  });

  test("a role with the capability is allowed through the gate", async () => {
    userCan.mockResolvedValue(true);
    const res = await deleteExperiment(req(id));
    expect(res.status).not.toBe(403);
    expect(deleteOne).toHaveBeenCalled();
  });

  test("the gate asks userCan for experiments.delete", async () => {
    userCan.mockResolvedValue(true);
    await deleteExperiment(req(id));
    expect(userCan).toHaveBeenCalledWith("experiments.delete");
  });
});

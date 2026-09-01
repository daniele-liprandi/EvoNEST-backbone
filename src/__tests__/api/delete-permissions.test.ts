/** @jest-environment node */

jest.mock("@/app/api/utils/mongodbClient", () => ({ get_or_create_client: jest.fn() }));
jest.mock("@/app/api/utils/get_database_user", () => ({
  get_database_user: jest.fn().mockResolvedValue("labdb"),
  get_current_user: jest.fn(),
  get_name_authuser: jest.fn().mockResolvedValue("tester"),
}));
jest.mock("@/app/api/utils/permissions", () => ({ userCan: jest.fn() }));

import { ObjectId } from "mongodb";
import { DELETE as deleteSample } from "@/app/api/samples/route";
import { DELETE as deleteTrait } from "@/app/api/traits/route";
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

const req = (url: string, id: string) =>
  new Request(url, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });

const id = new ObjectId().toHexString();

const cases = [
  ["samples", deleteSample, "http://x/api/samples"],
  ["traits", deleteTrait, "http://x/api/traits"],
  ["experiments", deleteExperiment, "http://x/api/experiments"],
] as const;

describe.each(cases)("%s DELETE permission gate", (label, handler, url) => {
  test("a role without the capability is refused with 403 and nothing is deleted", async () => {
    userCan.mockResolvedValue(false);
    const res = await handler(req(url, id));
    expect(res.status).toBe(403);
    expect(deleteOne).not.toHaveBeenCalled();
  });

  test("a role with the capability is allowed through the gate", async () => {
    userCan.mockResolvedValue(true);
    const res = await handler(req(url, id));
    expect(res.status).not.toBe(403);
    expect(deleteOne).toHaveBeenCalled();
  });

  test(`the gate asks userCan for ${label}.delete`, async () => {
    userCan.mockResolvedValue(true);
    await handler(req(url, id));
    expect(userCan).toHaveBeenCalledWith(`${label}.delete`);
  });
});

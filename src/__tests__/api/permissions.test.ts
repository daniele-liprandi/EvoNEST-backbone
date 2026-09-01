/** @jest-environment node */

jest.mock("@/app/api/utils/mongodbClient", () => ({
  get_or_create_client: jest.fn(),
}));
jest.mock("@/app/api/utils/get_database_user", () => ({
  get_current_user: jest.fn(),
}));

import { userCan, getUserCapabilities } from "@/app/api/utils/permissions";

const { get_or_create_client } = require("@/app/api/utils/mongodbClient");
const { get_current_user } = require("@/app/api/utils/get_database_user");

function stubConfig(docByType: Record<string, unknown[] | undefined>) {
  get_or_create_client.mockResolvedValue({
    db: () => ({
      collection: () => ({
        findOne: async ({ type }: { type: string }) =>
          docByType[type] ? { type, data: docByType[type] } : null,
      }),
    }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("userCan", () => {
  test("admin passes every capability regardless of the map", async () => {
    get_current_user.mockResolvedValue({ role: "admin" });
    stubConfig({ permissions: [{ value: "users.manage", roles: [] }] });
    await expect(userCan("users.manage")).resolves.toBe(true);
    await expect(userCan("anything.at.all")).resolves.toBe(true);
  });

  test("a non-admin role passes only its granted capabilities", async () => {
    get_current_user.mockResolvedValue({ role: "labManager" });
    stubConfig({
      permissions: [
        { value: "config.edit", roles: ["labManager"] },
        { value: "users.manage", roles: [] },
      ],
    });
    await expect(userCan("config.edit")).resolves.toBe(true);
    await expect(userCan("users.manage")).resolves.toBe(false);
  });

  test("falls back to the shipped defaults when the map is not seeded", async () => {
    get_current_user.mockResolvedValue({ role: "researcher" });
    stubConfig({});
    await expect(userCan("samples.delete")).resolves.toBe(true);
    await expect(userCan("config.seed")).resolves.toBe(false);
  });

  test("no session is false, not a throw", async () => {
    get_current_user.mockRejectedValue(new Error("Not authenticated"));
    await expect(userCan("config.edit")).resolves.toBe(false);
  });

  test("an unknown capability is denied for a non-admin", async () => {
    get_current_user.mockResolvedValue({ role: "viewer" });
    stubConfig({ permissions: [] });
    await expect(userCan("made.up")).resolves.toBe(false);
  });
});

describe("getUserCapabilities", () => {
  test("lists exactly the capabilities the role holds", async () => {
    get_current_user.mockResolvedValue({ role: "researcher" });
    stubConfig({
      permissions: [
        { value: "samples.delete", roles: ["researcher"] },
        { value: "traits.delete", roles: ["researcher"] },
        { value: "config.edit", roles: ["labManager"] },
      ],
    });
    await expect(getUserCapabilities()).resolves.toEqual(["samples.delete", "traits.delete"]);
  });

  test("admin gets the full list", async () => {
    get_current_user.mockResolvedValue({ role: "admin" });
    stubConfig({ permissions: [{ value: "a", roles: [] }, { value: "b", roles: [] }] });
    await expect(getUserCapabilities()).resolves.toEqual(["a", "b"]);
  });
});

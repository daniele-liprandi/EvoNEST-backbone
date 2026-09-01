/** @jest-environment node */

jest.mock("@/app/api/utils/mongodbClient", () => ({ get_or_create_client: jest.fn() }));
jest.mock("@/app/api/utils/get_database_user", () => ({
  get_current_user: jest.fn(),
  get_name_authuser: jest.fn().mockResolvedValue("tester"),
}));
jest.mock("@/app/api/utils/permissions", () => ({
  getRoles: jest.fn().mockResolvedValue([{ value: "admin", label: "Administrator" }]),
  getPermissions: jest.fn().mockResolvedValue([]),
}));

import { GET, POST } from "@/app/api/config/roles/route";

const { get_or_create_client } = require("@/app/api/utils/mongodbClient");
const { get_current_user } = require("@/app/api/utils/get_database_user");

const updateOne = jest.fn().mockResolvedValue({});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  get_or_create_client.mockResolvedValue({
    db: () => ({ collection: () => ({ updateOne }) }),
  });
});

const body = (obj: unknown) =>
  new Request("http://x/api/config/roles", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(obj),
  });

describe("GET /api/config/roles", () => {
  test("returns roles, permissions and the capability list", async () => {
    const res = await GET();
    const json = await res.json();
    expect(json.roles[0].value).toBe("admin");
    expect(Array.isArray(json.capabilities)).toBe(true);
  });
});

describe("POST /api/config/roles", () => {
  test("a non-admin cannot edit", async () => {
    get_current_user.mockResolvedValue({ role: "researcher" });
    const res = await POST(body({ method: "setRoles", data: [{ value: "admin", label: "A" }] }));
    expect(res.status).toBe(403);
    expect(updateOne).not.toHaveBeenCalled();
  });

  test("an admin can replace the roles list", async () => {
    get_current_user.mockResolvedValue({ role: "admin" });
    const res = await POST(
      body({ method: "setRoles", data: [{ value: "admin", label: "Administrator" }, { value: "curator", label: "Curator" }] }),
    );
    expect(res.status).toBe(200);
    expect(updateOne).toHaveBeenCalled();
  });

  test("the admin role cannot be removed", async () => {
    get_current_user.mockResolvedValue({ role: "admin" });
    const res = await POST(body({ method: "setRoles", data: [{ value: "curator", label: "Curator" }] }));
    expect(res.status).toBe(400);
  });

  test("permissions payload must have a roles array per entry", async () => {
    get_current_user.mockResolvedValue({ role: "admin" });
    const res = await POST(body({ method: "setPermissions", data: [{ value: "config.edit" }] }));
    expect(res.status).toBe(400);
  });
});

/** @jest-environment node */

jest.mock("@/app/api/utils/mongodbClient", () => ({ get_or_create_client: jest.fn() }));
jest.mock("@/app/api/utils/get_database_user", () => ({
  get_database_user: jest.fn().mockResolvedValue("labdb"),
  get_name_authuser: jest.fn().mockResolvedValue("tester"),
}));
jest.mock("@/app/api/utils/permissions", () => ({ userCan: jest.fn() }));

import { POST } from "@/app/api/config/types/seed/route";
import { resolvePreset } from "@/shared/config/lab-presets";

const { get_or_create_client } = require("@/app/api/utils/mongodbClient");
const { userCan } = require("@/app/api/utils/permissions");

const replaceOne = jest.fn().mockResolvedValue({ upsertedCount: 1 });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  userCan.mockResolvedValue(true);
  get_or_create_client.mockResolvedValue({
    db: () => ({ collection: () => ({ replaceOne }) }),
  });
});

const body = (obj: unknown) =>
  new Request("http://x/api/config/types/seed", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(obj),
  });

describe("config/types/seed with presets", () => {
  test("no body seeds every default config type", async () => {
    const res = await POST(new Request("http://x/api/config/types/seed", { method: "POST" }));
    expect(res.status).toBe(200);
    const seededTypes = replaceOne.mock.calls.map((c) => c[0].type);
    expect(seededTypes).toEqual(expect.arrayContaining(["sampletypes", "traittypes", "baseunits"]));
  });

  test("a preset overrides the types it names and keeps the rest", async () => {
    const res = await POST(body({ preset: "silk-biomechanics" }));
    expect(res.status).toBe(200);
    const byType = Object.fromEntries(replaceOne.mock.calls.map((c) => [c[0].type, c[1].data]));
    expect(byType.sampletypes.map((s: any) => s.value)).toContain("silk");
    expect(byType.traittypes.map((t: any) => t.value)).toContain("tensile_strength");
    // siprefixes not named by the preset -> still the default
    expect(byType.siprefixes.length).toBeGreaterThan(0);
  });

  test("an unknown preset is a 400", async () => {
    const res = await POST(body({ preset: "does-not-exist" }));
    expect(res.status).toBe(400);
    expect(replaceOne).not.toHaveBeenCalled();
  });

  test("a non-admin is refused", async () => {
    userCan.mockResolvedValue(false);
    const res = await POST(body({ preset: "generic" }));
    expect(res.status).toBe(403);
  });

  test("resolvePreset merges the override onto the defaults", () => {
    const resolved = resolvePreset("arthropod-husbandry");
    expect(resolved?.sampletypes.some((s: any) => s.value === "animal")).toBe(true);
    expect(resolved?.equipmenttypes.length).toBeGreaterThan(0);
    expect(resolvePreset("nope")).toBeNull();
  });
});

/** @jest-environment node */

import { Effect, Layer } from "effect";
import { runRoute, testMongo, testAuth } from "@/lib/effect";
import { getRolesConfig, handleRolesPost } from "@/app/api/config/roles/handlers";

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const admin = testAuth({ sub: "a1", name: "tester", role: "admin" });
const nonAdmin = testAuth({ sub: "u1", name: "tester", role: "researcher" });

const body = (obj: unknown) =>
  new Request("http://x/api/config/roles", { method: "POST", body: JSON.stringify(obj) });

describe("GET /api/config/roles", () => {
  test("returns roles, permissions and the capability list", async () => {
    // no config docs -> the shipped defaults
    const mongo = testMongo({ findOne: () => Effect.succeed(null) });
    const res = await runRoute(getRolesConfig.pipe(Effect.provide(Layer.merge(mongo, admin))));
    const json = await res.json();
    expect(json.roles.some((r: { value: string }) => r.value === "admin")).toBe(true);
    expect(Array.isArray(json.capabilities)).toBe(true);
    expect(Array.isArray(json.permissions)).toBe(true);
  });
});

describe("POST /api/config/roles", () => {
  test("a non-admin cannot edit", async () => {
    const updateOne = jest.fn(() => Effect.succeed({} as never));
    const res = await runRoute(
      handleRolesPost(body({ method: "setRoles", data: [{ value: "admin", label: "A" }] })).pipe(
        Effect.provide(Layer.merge(testMongo({ updateOne }), nonAdmin)),
      ),
    );
    expect(res.status).toBe(403);
    expect(updateOne).not.toHaveBeenCalled();
  });

  test("an admin can replace the roles list", async () => {
    const updateOne = jest.fn(() => Effect.succeed({} as never));
    const res = await runRoute(
      handleRolesPost(
        body({
          method: "setRoles",
          data: [
            { value: "admin", label: "Administrator" },
            { value: "curator", label: "Curator" },
          ],
        }),
      ).pipe(Effect.provide(Layer.merge(testMongo({ updateOne }), admin))),
    );
    expect(res.status).toBe(200);
    expect(updateOne).toHaveBeenCalled();
  });

  test("the admin role cannot be removed", async () => {
    const res = await runRoute(
      handleRolesPost(body({ method: "setRoles", data: [{ value: "curator", label: "Curator" }] })).pipe(
        Effect.provide(Layer.merge(testMongo(), admin)),
      ),
    );
    expect(res.status).toBe(400);
  });

  test("permissions payload must have a roles array per entry", async () => {
    const res = await runRoute(
      handleRolesPost(body({ method: "setPermissions", data: [{ value: "config.edit" }] })).pipe(
        Effect.provide(Layer.merge(testMongo(), admin)),
      ),
    );
    expect(res.status).toBe(400);
  });

  test("an unknown method is a 400", async () => {
    const res = await runRoute(
      handleRolesPost(body({ method: "drop", data: [] })).pipe(Effect.provide(Layer.merge(testMongo(), admin))),
    );
    expect(res.status).toBe(400);
  });
});

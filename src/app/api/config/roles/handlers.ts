import { Effect, Schema } from "effect";
import {
  ok,
  decodeBody,
  currentSession,
  requireRole,
  roleList,
  permissionMap,
  Mongo,
  ValidationError,
} from "@/lib/effect";
import { CAPABILITIES } from "@/shared/config/default-roles";

export const getRolesConfig = Effect.gen(function* () {
  return yield* ok({
    roles: yield* roleList,
    permissions: yield* permissionMap,
    capabilities: CAPABILITIES,
  });
});

const PostBody = Schema.Struct({
  method: Schema.Literal("setRoles", "setPermissions"),
  data: Schema.Array(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
});

const writeConfig = (type: string, data: unknown, by: string) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    yield* mongo.updateOne(
      "usersdb",
      "config",
      { type },
      { $set: { type, data, lastModified: new Date().toISOString(), modifiedBy: by } },
      { upsert: true },
    );
  });

export const handleRolesPost = (request: Request) =>
  Effect.gen(function* () {
    // Editing roles and the permission map is a privilege-escalation surface, so
    // it is strictly the admin role — never delegatable through the map itself.
    yield* requireRole("admin");
    const by = (yield* currentSession).name ?? "unknown user";
    const { method, data } = yield* decodeBody(PostBody)(request);

    if (method === "setRoles") {
      if (!data.every((r) => r.value && r.label)) {
        return yield* Effect.fail(new ValidationError({ message: "Each role needs a value and a label" }));
      }
      if (!data.some((r) => r.value === "admin")) {
        return yield* Effect.fail(new ValidationError({ message: "The admin role cannot be removed" }));
      }
      yield* writeConfig("roles", data, by);
      return yield* ok({ message: "Roles updated" });
    }

    if (!data.every((p) => p.value && Array.isArray(p.roles))) {
      return yield* Effect.fail(
        new ValidationError({ message: "Each entry needs a capability and a roles array" }),
      );
    }
    yield* writeConfig("permissions", data, by);
    return yield* ok({ message: "Permissions updated" });
  });

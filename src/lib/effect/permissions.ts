import { Effect } from "effect";
import { Mongo } from "./db";
import { Auth, currentUser } from "./auth";
import { ForbiddenError, InternalError, UnauthorizedError } from "./errors";
import { DEFAULT_PERMISSIONS, DEFAULT_ROLES } from "@/shared/config/default-roles";

/**
 * Capability checks as Effects. The Effect twin of `api/utils/permissions.js`,
 * for routes on the Effect line. A handler yields `userCan("samples.delete")`
 * or `yield* requireCapability(...)` instead of importing the callback helper.
 */

interface PermissionEntry {
  readonly value: string;
  readonly roles?: ReadonlyArray<string>;
}

interface RoleEntry {
  readonly value: string;
  readonly label?: string;
  readonly description?: string;
}

const USERS_DB = "usersdb";

// Roles and the permission map are global (roles live on the global user
// record), so they sit in usersdb.config, same { type, data } shape as the
// per-lab config. A read failure falls back to the shipped defaults — a config
// outage must not lock everyone out.
const readConfig = <T>(type: string, fallback: ReadonlyArray<T>) =>
  Effect.gen(function* () {
    const mongo = yield* Mongo;
    const doc = yield* mongo
      .findOne(USERS_DB, "config", { type })
      .pipe(Effect.catchAll(() => Effect.succeed(null)));
    const data = doc?.data;
    return Array.isArray(data) && data.length > 0 ? (data as ReadonlyArray<T>) : fallback;
  });

/** The capability -> roles map an admin has defined, or the shipped defaults. */
export const permissionMap = readConfig<PermissionEntry>("permissions", DEFAULT_PERMISSIONS);

/** The roles an admin has defined, or the shipped defaults. */
export const roleList = readConfig<RoleEntry>("roles", DEFAULT_ROLES);

// First-admin bootstrap: until someone holds the admin role, every signed-in
// user is treated as one so the first person can finish setup. Fails closed
// (assumes an admin exists) on a read error.
const noAdminExists = Effect.gen(function* () {
  const mongo = yield* Mongo;
  const admin = yield* mongo
    .findOne(USERS_DB, "users", { role: "admin" })
    .pipe(Effect.catchAll(() => Effect.succeed({})));
  return admin == null;
});

const roleAllows = (permissions: ReadonlyArray<PermissionEntry>, capability: string, role: string | null) => {
  const entry = permissions.find((p) => p.value === capability);
  return role != null && Array.isArray(entry?.roles) && entry.roles.includes(role);
};

/**
 * Whether the current user may perform `capability`. Admin and the first-admin
 * bootstrap always pass. Fails with 401 when there is no session.
 */
export const userCan = (
  capability: string,
): Effect.Effect<boolean, UnauthorizedError | InternalError, Mongo | Auth> =>
  Effect.gen(function* () {
    const user = yield* currentUser;
    if (user.role === "admin") return true;
    if (yield* noAdminExists) return true;
    return roleAllows(yield* permissionMap, capability, user.role);
  });

/** Fail with 403 unless the current user holds `capability`. */
export const requireCapability = (capability: string) =>
  userCan(capability).pipe(
    Effect.flatMap((allowed) =>
      allowed
        ? Effect.void
        : Effect.fail(new ForbiddenError({ message: `Requires the ${capability} capability` })),
    ),
  );

/** Every capability the current user holds — for the frontend to show/hide UI. */
export const userCapabilities: Effect.Effect<
  ReadonlyArray<string>,
  UnauthorizedError | InternalError,
  Mongo | Auth
> = Effect.gen(function* () {
  const user = yield* currentUser;
  const permissions = yield* permissionMap;
  if (user.role === "admin" || (yield* noAdminExists)) return permissions.map((p) => p.value);
  return permissions
    .filter((p) => user.role != null && p.roles?.includes(user.role))
    .map((p) => p.value);
});

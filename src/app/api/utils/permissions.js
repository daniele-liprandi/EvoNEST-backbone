import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { get_current_user } from "@/app/api/utils/get_database_user";
import { DEFAULT_PERMISSIONS, DEFAULT_ROLES } from "@/shared/config/default-roles";

// Roles and the permission map are global (roles live on the global user
// record), so they sit in usersdb.config rather than a per-lab config
// collection. Same document shape as the per-lab config: { type, data, ... }.

async function readConfig(type, fallback) {
  try {
    const client = await get_or_create_client();
    if (!client) return fallback;
    const doc = await client.db("usersdb").collection("config").findOne({ type });
    return Array.isArray(doc?.data) && doc.data.length > 0 ? doc.data : fallback;
  } catch (error) {
    console.error(`permissions: falling back to defaults for ${type}:`, error);
    return fallback;
  }
}

/** The roles an admin has defined, or the shipped defaults. */
export async function getRoles() {
  return readConfig("roles", DEFAULT_ROLES);
}

/** The capability -> roles map an admin has defined, or the shipped defaults. */
export async function getPermissions() {
  return readConfig("permissions", DEFAULT_PERMISSIONS);
}

function roleAllows(permissions, capability, role) {
  if (role === "admin") return true; // admin bootstrap: never lock everyone out
  const entry = permissions.find((p) => p.value === capability);
  return Array.isArray(entry?.roles) && entry.roles.includes(role);
}

/**
 * Whether the current user may perform `capability`. Replaces the scattered
 * `check_user_role("admin")` calls. Returns false (not throws) when there is no
 * session, so a route can map it to its own 401/403.
 */
export async function userCan(capability) {
  try {
    const user = await get_current_user();
    if (user.role === "admin") return true;
    const permissions = await getPermissions();
    return roleAllows(permissions, capability, user.role);
  } catch {
    return false;
  }
}

/** Every capability the current user holds — for the frontend to show/hide UI. */
export async function getUserCapabilities() {
  try {
    const user = await get_current_user();
    const permissions = await getPermissions();
    if (user.role === "admin") return permissions.map((p) => p.value);
    return permissions.filter((p) => p.roles?.includes(user.role)).map((p) => p.value);
  } catch {
    return [];
  }
}

import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { NextResponse } from "next/server";
import { get_current_user, get_name_authuser } from "@/app/api/utils/get_database_user";
import { getPermissions, getRoles } from "@/app/api/utils/permissions";
import { CAPABILITIES } from "@/shared/config/default-roles";

// Editing roles and the permission map is a privilege-escalation surface, so it
// is strictly `role === "admin"` — never delegatable through the map itself.
async function isAdmin() {
  try {
    return (await get_current_user()).role === "admin";
  } catch {
    return false;
  }
}

async function writeConfig(type, data, authuser) {
  const client = await get_or_create_client();
  if (!client) return false;
  await client.db("usersdb").collection("config").updateOne(
    { type },
    { $set: { type, data, lastModified: new Date().toISOString(), modifiedBy: authuser } },
    { upsert: true },
  );
  return true;
}

/**
 * @swagger
 * /api/config/roles:
 *   get:
 *     summary: Roles, the permission map and the capability list
 *     tags: [Configuration]
 *     responses:
 *       200: { description: Roles configuration }
 *   post:
 *     summary: Replace the roles list or the permission map (admin only)
 *     tags: [Configuration]
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Invalid payload }
 *       403: { description: Not an administrator }
 */
export async function GET() {
  try {
    return NextResponse.json({
      roles: await getRoles(),
      permissions: await getPermissions(),
      capabilities: CAPABILITIES,
    });
  } catch (error) {
    console.error("config/roles GET error:", error);
    return NextResponse.json({ error: "Failed to load roles" }, { status: 500 });
  }
}

export async function POST(req) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Only an administrator can edit roles" }, { status: 403 });
  }

  const { method, data } = await req.json();
  const authuser = (await get_name_authuser()) || "unknown user";

  if (method === "setRoles") {
    if (!Array.isArray(data) || !data.every((r) => r?.value && r?.label)) {
      return NextResponse.json({ error: "Each role needs a value and a label" }, { status: 400 });
    }
    if (!data.some((r) => r.value === "admin")) {
      return NextResponse.json({ error: "The admin role cannot be removed" }, { status: 400 });
    }
    if (!(await writeConfig("roles", data, authuser))) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }
    return NextResponse.json({ message: "Roles updated" });
  }

  if (method === "setPermissions") {
    if (!Array.isArray(data) || !data.every((p) => p?.value && Array.isArray(p?.roles))) {
      return NextResponse.json({ error: "Each entry needs a capability and a roles array" }, { status: 400 });
    }
    if (!(await writeConfig("permissions", data, authuser))) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }
    return NextResponse.json({ message: "Permissions updated" });
  }

  return NextResponse.json({ error: "Invalid method" }, { status: 400 });
}

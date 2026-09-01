import { NextResponse } from "next/server";
import { get_current_user } from "@/app/api/utils/get_database_user";
import { getUserCapabilities } from "@/app/api/utils/permissions";

/**
 * @swagger
 * /api/user/role:
 *   get:
 *     summary: Current user's role and capabilities
 *     description: The signed-in user's role, the capabilities it grants, and the legacy isAdmin flag.
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: Role information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role:
 *                   type: string
 *                   example: researcher
 *                 isAdmin:
 *                   type: boolean
 *                 capabilities:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["config.edit", "samples.delete"]
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
export async function GET(req) {
    try {
        const user = await get_current_user();
        const role = user.role ?? null;
        return NextResponse.json({
            role,
            isAdmin: role === "admin",
            capabilities: await getUserCapabilities(),
        });
    } catch (error) {
        if (error.message === "Not authenticated") {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }
        console.error("user/role error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

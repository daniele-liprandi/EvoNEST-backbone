import { NextResponse } from "next/server";
import { check_user_role } from "@/app/api/utils/get_database_user";

/**
 * @swagger
 * /api/user/role:
 *   get:
 *     summary: Check current user's role
 *     description: Returns the current authenticated user's role information
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: Role information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isAdmin:
 *                   type: boolean
 *                   description: Whether the user has admin role
 *                   example: true
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
export async function GET(req) {
    try {
        const isAdmin = await check_user_role('admin');
        return NextResponse.json({ isAdmin });
    } catch (error) {
        if (error.message === 'Not authenticated') {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

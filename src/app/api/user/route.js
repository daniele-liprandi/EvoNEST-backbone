import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *           example: "507f1f77bcf86cd799439011"
 *         auth0id:
 *           type: string
 *           description: Auth0 user identifier
 *           example: "auth0|507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           description: User's full name
 *           example: "John Doe"
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "john.doe@example.com"
 *         recentChangeDate:
 *           type: string
 *           format: date-time
 *           description: Last modification timestamp
 *           example: "2024-03-15T10:30:00Z"
 *     UserUpdateRequest:
 *       type: object
 *       required:
 *         - method
 *         - field
 *         - value
 *       properties:
 *         method:
 *           type: string
 *           enum: [setfield]
 *           description: Update method
 *           example: "setfield"
 *         field:
 *           type: string
 *           description: Field name to update
 *           example: "name"
 *         value:
 *           oneOf:
 *             - type: string
 *             - type: number
 *             - type: boolean
 *           description: New value for the field
 *           example: "Jane Doe"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 *           example: "Not authenticated"
 */

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Get current user information
 *     description: Retrieves the current authenticated user's profile information from the database
 *     tags:
 *       - Users
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User not found in database
 *       500:
 *         description: Database connection error
 */
export async function GET(req) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return new NextResponse(null, { status: 401 });
    }

    const client = await get_or_create_client();
    if (client == null) {
        return new NextResponse(null, { status: 500 });
    }

    const db = await client.db("usersdb");
    const users = await db.collection("users");
    const user = await users.findOne({ auth0id: session.user.sub });

    if (user == null) {
        return new NextResponse(null, { status: 404 });
    }

    return NextResponse.json(user);
}

/**
 * @swagger
 * /api/user:
 *   post:
 *     summary: Update user information
 *     description: Updates specific fields in the current authenticated user's profile
 *     tags:
 *       - Users
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateRequest'
 *           examples:
 *             updateName:
 *               summary: Update user name
 *               value:
 *                 method: "setfield"
 *                 field: "name"
 *                 value: "Jane Doe"
 *             updateEmail:
 *               summary: Update user email
 *               value:
 *                 method: "setfield"
 *                 field: "email"
 *                 value: "jane.doe@example.com"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User updated successfully"
 *       400:
 *         description: Invalid method or request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const client = await get_or_create_client();
        if (!client) {
            return NextResponse.json({ error: "Failed to connect to database" }, { status: 500 });
        }

        const db = client.db("usersdb");
        const users = db.collection("users");

        const body = await req.json();

        if (body.method === "setfield") {
            const { field, value } = body;
            const updateData = {
                [field]: value,
                recentChangeDate: new Date().toISOString()
            };

            const result = await users.updateOne(
                { auth0id: session.user.sub },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            return NextResponse.json({ message: "User updated successfully" });
        }

        return NextResponse.json({ error: "Invalid method" }, { status: 400 });
    } catch (error) {
        console.error("Error in POST /api/users:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
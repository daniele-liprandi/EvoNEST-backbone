/**
 * @swagger
 * /api/user/database:
 *   get:
 *     summary: Get user's database access information
 *     description: Retrieve list of databases the user has access to and their currently active database
 *     tags:
 *       - Users
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Database information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 databases:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of databases user has access to
 *                 activeDatabase:
 *                   type: string
 *                   description: Currently active database for the user
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 *   post:
 *     summary: Set active database for user
 *     description: Switch the user's active database to a different one they have access to
 *     tags:
 *       - Users
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - database
 *             properties:
 *               database:
 *                 type: string
 *                 description: Name of the database to set as active
 *     responses:
 *       200:
 *         description: Active database updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Database not authorized for user
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

import { getServerSession } from "next-auth";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return new NextResponse(null, { status: 401 });
        }

        const client = await get_or_create_client();
        const users = client.db("usersdb").collection("users");
        const userdb = await users.findOne({ auth0id: session.user.sub });
        
        if (!userdb) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            databases: userdb.databases || [],
            activeDatabase: userdb.activeDatabase
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return new NextResponse(null, { status: 401 });
        }

        const { database } = await req.json();
        const client = await get_or_create_client();
        const users = client.db("usersdb").collection("users");
        const userdb = await users.findOne({ auth0id: session.user.sub });

        if (!userdb) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!userdb.databases.includes(database)) {
            return NextResponse.json({ error: "Database not authorized for user" }, { status: 403 });
        }

        await users.updateOne(
            { auth0id: session.user.sub },
            { 
                $set: { 
                    activeDatabase: database,
                    recentChangeDate: new Date().toISOString()
                },
                $push: { 
                    logbook: `${new Date().toISOString()}: changed active database to ${database}`
                }
            }
        );

        return NextResponse.json({ success: true, activeDatabase: database });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
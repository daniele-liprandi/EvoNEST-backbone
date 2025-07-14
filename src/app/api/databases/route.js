import { NextResponse } from "next/server";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { check_user_role } from "@/app/api/utils/get_database_user";

/**
 * @swagger
 * /api/databases:
 *   get:
 *     summary: Get available databases
 *     description: Retrieve list of available databases that can be assigned to users
 *     tags:
 *       - Databases
 *     responses:
 *       200:
 *         description: Database list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 databases:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["admin", "evonest", "spiderdb", "research"]
 *       500:
 *         description: Server error
 *   post:
 *     summary: Add a new database
 *     description: Add a new database to the available databases list (admin only)
 *     tags:
 *       - Databases
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               database:
 *                 type: string
 *                 description: Database name to add
 *                 example: "newproject"
 *     responses:
 *       200:
 *         description: Database added successfully
 *       403:
 *         description: Access denied (admin only)
 *       400:
 *         description: Invalid request or database already exists
 *       500:
 *         description: Server error
 */

export async function GET(req) {
    try {
        const client = await get_or_create_client();
        if (!client) {
            return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
        }

        const db = client.db("systemdb");
        const settingsCollection = db.collection("settings");
        
        // Get the databases list from settings
        let databaseSettings = await settingsCollection.findOne({ type: "databases" });
        
        // If no databases settings exist, create default ones
        if (!databaseSettings) {
            const defaultDatabases = ["admin", "evonest"];
            databaseSettings = {
                type: "databases",
                databases: defaultDatabases,
                createdDate: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };
            await settingsCollection.insertOne(databaseSettings);
        }

        return NextResponse.json({ databases: databaseSettings.databases || [] });
    } catch (error) {
        console.error("Error fetching databases:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        // Check if user is admin
        const isAdmin = await check_user_role('admin');
        if (!isAdmin) {
            return NextResponse.json({ error: "Only administrators can add databases" }, { status: 403 });
        }

        const { database } = await req.json();
        
        if (!database || typeof database !== 'string' || database.trim().length === 0) {
            return NextResponse.json({ error: "Database name is required" }, { status: 400 });
        }

        const databaseName = database.trim().toLowerCase();

        const client = await get_or_create_client();
        if (!client) {
            return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
        }

        const db = client.db("systemdb");
        const settingsCollection = db.collection("settings");
        
        // Get current databases
        let databaseSettings = await settingsCollection.findOne({ type: "databases" });
        
        if (!databaseSettings) {
            // Create new settings document
            databaseSettings = {
                type: "databases",
                databases: [databaseName],
                createdDate: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };
            await settingsCollection.insertOne(databaseSettings);
        } else {
            // Check if database already exists
            if (databaseSettings.databases.includes(databaseName)) {
                return NextResponse.json({ error: "Database already exists" }, { status: 400 });
            }

            // Add new database to the list
            await settingsCollection.updateOne(
                { type: "databases" },
                {
                    $push: { databases: databaseName },
                    $set: { lastModified: new Date().toISOString() }
                }
            );
        }

        return NextResponse.json({ 
            message: "Database added successfully",
            database: databaseName 
        });
    } catch (error) {
        console.error("Error adding database:", error);
        if (error.message === 'Not authenticated') {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

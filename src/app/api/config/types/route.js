import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { get_database_user, get_name_authuser } from "@/app/api/utils/get_database_user";

/**
 * @swagger
 * components:
 *   schemas:
 *     ConfigItem:
 *       type: object
 *       required:
 *         - value
 *         - label
 *       properties:
 *         value:
 *           type: string
 *           description: Unique identifier for the item
 *           example: "animal"
 *         label:
 *           type: string
 *           description: Display name for the item
 *           example: "Animal"
 *         description:
 *           type: string
 *           description: Optional description
 *           example: "Animal individual"
 *         unit:
 *           type: string
 *           description: Optional unit (for traits)
 *           example: "g"
 *         shortened:
 *           type: string
 *           description: Optional abbreviated form
 *           example: "an"
 *     ConfigType:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *         type:
 *           type: string
 *           enum: [sampletypes, traittypes, equipmenttypes, samplesubtypes, silkcategories, siprefixes, baseunits]
 *           description: Configuration type
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ConfigItem'
 *         version:
 *           type: number
 *           description: Configuration version
 *         lastModified:
 *           type: string
 *           format: date-time
 *         modifiedBy:
 *           type: string
 *           description: User who last modified
 *         isDefault:
 *           type: boolean
 *           description: Whether this is system default
 */

async function getConfig(client, type = null) {
    const dbname = await get_database_user();
    const db = client.db(dbname);
    
    if (type) {
        return await db.collection("config").findOne({ type });
    }
    return await db.collection("config").find().toArray();
}

/**
 * @swagger
 * /api/config/types:
 *   get:
 *     summary: Retrieve configuration
 *     description: Get all configuration types or a specific type
 *     tags:
 *       - Configuration
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [sampletypes, traittypes, equipmenttypes, samplesubtypes, silkcategories, siprefixes, baseunits]
 *         description: Specific configuration type to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved configuration
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/ConfigType'
 *                 - $ref: '#/components/schemas/ConfigType'
 *       500:
 *         description: Database connection error
 */
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    
    const client = await get_or_create_client();
    if (client == null) {
        return new NextResponse(null, { status: 500 });
    }

    try {
        const config = await getConfig(client, type);
        return NextResponse.json(config);
    } catch (error) {
        console.error('Config GET error:', error);
        return new NextResponse(JSON.stringify({ error: "Failed to retrieve configuration" }), { status: 500 });
    }
}

/**
 * @swagger
 * /api/config/types:
 *   post:
 *     summary: Create or update configuration
 *     description: |
 *       Handle configuration operations:
 *       - **create**: Create new configuration type
 *       - **update**: Update entire configuration type
 *       - **additem**: Add single item to configuration
 *       - **updateitem**: Update single item in configuration
 *       - **deleteitem**: Remove single item from configuration
 *       - **seed**: Initialize with default data
 *     tags:
 *       - Configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 properties:
 *                   method:
 *                     type: string
 *                     enum: [create, update, additem, updateitem, deleteitem, seed]
 *                   type:
 *                     type: string
 *                     enum: [sampletypes, traittypes, equipmenttypes, samplesubtypes, silkcategories, siprefixes]
 *                   data:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/ConfigItem'
 *                   item:
 *                     $ref: '#/components/schemas/ConfigItem'
 *                   oldValue:
 *                     type: string
 *                     description: For updateitem - the current value to update
 *     responses:
 *       200:
 *         description: Operation successful
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
export async function POST(req) {
    const data = await req.json();
    const client = await get_or_create_client();
    const authuser = await get_name_authuser() || "unknown user";

    if (client == null) {
        return new NextResponse(JSON.stringify({ error: "Failed to connect to database" }), { status: 500 });
    }

    const dbname = await get_database_user();
    const db = client.db(dbname);
    const config = db.collection("config");

    try {
        const now = new Date().toISOString();

        if (data.method === "additem") {
            // Add a single item to existing configuration
            const result = await config.updateOne(
                { type: data.type },
                { 
                    $push: { data: data.item },
                    $set: { 
                        lastModified: now,
                        modifiedBy: authuser 
                    },
                    $inc: { version: 1 }
                },
                { upsert: true }
            );

            return NextResponse.json({ message: "Item added successfully" });
        }

        if (data.method === "updateitem") {
            // Update a single item in configuration
            const result = await config.updateOne(
                { type: data.type, "data.value": data.oldValue },
                { 
                    $set: { 
                        "data.$": data.item,
                        lastModified: now,
                        modifiedBy: authuser 
                    },
                    $inc: { version: 1 }
                }
            );

            if (result.modifiedCount === 0) {
                return new NextResponse(JSON.stringify({ error: "Item not found" }), { status: 404 });
            }

            return NextResponse.json({ message: "Item updated successfully" });
        }

        if (data.method === "deleteitem") {
            // Remove a single item from configuration
            const result = await config.updateOne(
                { type: data.type },
                { 
                    $pull: { data: { value: data.value } },
                    $set: { 
                        lastModified: now,
                        modifiedBy: authuser 
                    },
                    $inc: { version: 1 }
                }
            );

            return NextResponse.json({ message: "Item deleted successfully" });
        }

        if (data.method === "seed") {
            // Initialize configuration with default data (only if doesn't exist)
            const existing = await config.findOne({ type: data.type });
            if (existing) {
                return NextResponse.json({ message: "Configuration already exists" });
            }

            const configData = {
                type: data.type,
                data: data.data,
                version: 1,
                lastModified: now,
                modifiedBy: authuser,
                isDefault: true
            };

            await config.insertOne(configData);
            return NextResponse.json({ message: "Configuration seeded successfully" });
        }

        if (data.method === "update") {
            // Update entire configuration
            const result = await config.replaceOne(
                { type: data.type },
                {
                    type: data.type,
                    data: data.data,
                    version: data.version ? data.version + 1 : 1,
                    lastModified: now,
                    modifiedBy: authuser,
                    isDefault: false
                },
                { upsert: true }
            );

            return NextResponse.json({ message: "Configuration updated successfully" });
        }

        return new NextResponse(JSON.stringify({ error: "Invalid method" }), { status: 400 });

    } catch (error) {
        console.error('Config POST error:', error);
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { type, value } = await req.json();
        const client = await get_or_create_client();
        
        if (!client) {
            return new NextResponse(JSON.stringify({ error: "Failed to connect to database" }), { status: 500 });
        }

        const dbname = await get_database_user();
        const db = client.db(dbname);
        const config = db.collection("config");
        const authuser = await get_name_authuser() || "unknown user";

        if (value) {
            // Delete specific item
            const result = await config.updateOne(
                { type },
                { 
                    $pull: { data: { value } },
                    $set: { 
                        lastModified: new Date().toISOString(),
                        modifiedBy: authuser 
                    },
                    $inc: { version: 1 }
                }
            );
        } else {
            // Delete entire configuration type
            const result = await config.deleteOne({ type });
        }

        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error) {
        console.error('Config DELETE error:', error);
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

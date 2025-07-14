import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { get_database_user } from "@/app/api/utils/get_database_user";

/**
 * @swagger
 * /api/sample:
 *   post:
 *     summary: Retrieve a single sample
 *     description: Get a single sample by name, ID, or other query parameters using JSON body
 *     tags:
 *       - Sample
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Filter by sample name (exact match)
 *                 example: "MACN-Ar 47148"
 *               id:
 *                 type: string
 *                 description: Filter by sample ID
 *                 example: "507f1f77bcf86cd799439011"
 *               type:
 *                 type: string
 *                 enum: [animal, silk, subsample, other]
 *                 description: Filter by sample type
 *                 example: "animal"
 *           examples:
 *             by_name_and_type:
 *               summary: Find animal by name
 *               value:
 *                 name: "MACN-Ar 47148"
 *                 type: "animal"
 *             by_id:
 *               summary: Find by ID
 *               value:
 *                 id: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Sample found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sample'
 *       404:
 *         description: Sample not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Sample not found"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "At least one query parameter (name, id, or type) is required"
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Database connection failed"
 */
export async function POST(request) {
    try {
        // Ensure the database client is connected
        const client = await get_or_create_client();
        if (client == null) {
            return NextResponse.json(
                { error: "Database connection failed" },
                { status: 500 }
            );
        }

        // Parse JSON body
        const body = await request.json();
        const { name, id, type } = body;

        // Build query object
        const query = {};
        
        if (name) {
            query.name = name; // Exact match for name
        }
        
        if (id) {
            try {
                query._id = new ObjectId(id);
            } catch (error) {
                return NextResponse.json(
                    { error: "Invalid ID format" },
                    { status: 400 }
                );
            }
        }
        
        if (type) {
            query.type = type;
        }

        // If no query parameters provided, return error
        if (Object.keys(query).length === 0) {
            return NextResponse.json(
                { error: "At least one query parameter (name, id, or type) is required" },
                { status: 400 }
            );
        }

        // Get database and collection
        const dbname = await get_database_user();
        const db = client.db(dbname);
        const samples = db.collection("samples");

        // Find the sample
        const sample = await samples.findOne(query);

        if (!sample) {
            return NextResponse.json(
                { error: "Sample not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(sample);

    } catch (error) {
        console.error('Error in POST /api/sample:', error);
        return NextResponse.json(
            { error: "Internal server error", details: error.message },
            { status: 500 }
        );
    }
}

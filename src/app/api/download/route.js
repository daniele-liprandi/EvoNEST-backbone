import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { get_database_user } from "@/app/api/utils/get_database_user";
import { ObjectId } from "mongodb";

const STORAGE_PATH = process.env.STORAGE_PATH 

/**
 * @swagger
 * /api/download:
 *   get:
 *     summary: Download a file by ID
 *     description: Downloads a file from the server using its database ID. The file metadata is retrieved from the database and the actual file is served from the file system.
 *     tags:
 *       - Files
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the file to download
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *             description: Attachment with original filename
 *             example: 'attachment; filename="data.csv"'
 *           Content-Type:
 *             schema:
 *               type: string
 *             description: MIME type of the file
 *             example: "text/csv"
 *       400:
 *         description: File ID is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "File ID is required."
 *       404:
 *         description: File not found in database or on server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "File not found."
 *       500:
 *         description: Database connection error or server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to connect to database"
 */
export async function GET(req) {
    // Get the file ID from the query parameters
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
        return NextResponse.json({ error: "File ID is required." }, { status: 400 });
    }

    const client = await get_or_create_client();
    if (!client) {
        console.error('Failed to connect to database');
        return NextResponse.json({ error: "Failed to connect to database" }, { status: 500 });
    }

    const dbname = await get_database_user();
    const db = client.db(dbname);
    const filesCollection = db.collection("files");

    try {
        // Find the file document in the database
        const fileDoc = await filesCollection.findOne({ _id: new ObjectId(fileId) });

        if (!fileDoc) {
            return NextResponse.json({ error: "File not found." }, { status: 404 });
        }

        const filePath = fileDoc.path;

        // Check if the file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            console.error('File not found on the server:', error);
            return NextResponse.json({ error: "File not found on the server." }, { status: 404 });
        }

        // Read the file
        const fileBuffer = await fs.readFile(filePath);

        // Set the appropriate headers for file download
        const headers = new Headers();
        headers.set('Content-Disposition', `attachment; filename="${fileDoc.name}"`);
        headers.set('Content-Type', 'application/octet-stream');

        // Return the file as a stream
        return new NextResponse(fileBuffer, {
            status: 200,
            headers: headers,
        });

    } catch (error) {
        console.error('Error occurred during file download:', error);
        return NextResponse.json({ error: "An error occurred while processing your request." }, { status: 500 });
    }
}
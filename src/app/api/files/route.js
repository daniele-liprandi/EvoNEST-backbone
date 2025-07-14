import { NextResponse } from "next/server";
import path from "path";
import { writeFile } from "fs/promises";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { get_database_user } from "@/app/api/utils/get_database_user";
import { ObjectId } from "mongodb";
import fs from "fs";

export const dynamic = 'force-dynamic';

// Define the storage path for uploaded files
const STORAGE_PATH = process.env.STORAGE_PATH;

/**
 * GET handler for retrieving files
 * @returns {Promise<NextResponse>} A promise that resolves to a NextResponse object containing the files
 */
export async function GET() {
    try {
        const client = await get_or_create_client();
        if (client == null) {
            return new NextResponse(JSON.stringify({ error: "Failed to connect to database" }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const dbname = await get_database_user();
        const db = client.db(dbname);
        const files = await db.collection("files").find().toArray();

        return NextResponse.json(files);
    } catch (error) {
        console.error("Error fetching files:", error);
        return new NextResponse(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * POST handler for file upload
 * @param {Request} req - The incoming request object
 * @returns {Promise<NextResponse>} A promise that resolves to a NextResponse object containing the id of the uploaded file
 */

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get("file");
        let type = formData.get("type");
        const metadataStr = formData.get("metadata");

        if (!file) {
            return NextResponse.json({ error: "No files received." }, { status: 400 });
        }

        // Parse metadata and validate
        const metadata = JSON.parse(metadataStr || '{}');
        const { entryType, entryId, deferredLink } = metadata;

        // Only validate entryType/entryId if not deferred
        if (!deferredLink && (!entryType || !entryId)) {
            return NextResponse.json({ error: "Missing entryType or entryId in metadata" }, { status: 400 });
        }

        // Connect to database
        const client = await get_or_create_client();
        if (!client) {
            console.error('Failed to connect to database');
            return NextResponse.json({ error: "Failed to connect to database" }, { status: 500 });
        }

        const dbname = await get_database_user();
        const db = client.db(dbname);
        const filesCollection = db.collection("files");

        // Generate new ObjectId and prepare filename
        const fileId = new ObjectId();
        const filename = file.name.replaceAll(" ", "_");
        type = type?.replaceAll(" ", "_") || 'unknown';

        // Construct the file path
        let filePath;
        if (deferredLink) {
            // Store in temporary location
            filePath = path.join(
                STORAGE_PATH,
                dbname,
                type,
                'temp',
                fileId.toString(),
                filename
            );
        } else {
            // Store in final location
            filePath = path.join(
                STORAGE_PATH,
                dbname,
                type,
                entryType,
                entryId,
                filename
            );
        }

        const folderPath = path.dirname(filePath);
        await ensureDirectoryExists(folderPath);

        // Write file to filesystem
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        // Prepare and insert file document
        const fileDoc = {
            _id: fileId,
            name: filename,
            path: filePath,
            metadata: {
                ...metadata,
                uploadDate: new Date(),
                isTemporary: deferredLink
            }
        };

        await filesCollection.insertOne(fileDoc);

        // If not deferred, link to the entry
        if (!deferredLink) {
            const entryCollection = db.collection(
                entryType === 'sample' ? 'samples' :
                    entryType === 'trait' ? 'traits' : 'experiments'
            );

            const logbookEntry = [
                `${new Date().toISOString()}`,
                `Uploaded file ${filename} of type ${type} and id ${fileId}`
            ];

            // HACK I generated the demo data with a string id instead of a ObjectId
            const updateResult = await entryCollection.updateOne(
                { _id: entryId },
                {
                    $addToSet: { filesId: fileId.toString() },
                    $set: { recentChangeDate: new Date().toISOString() },
                    $push: { logbook: logbookEntry }
                }
            );

            if (updateResult.matchedCount === 0) {
                const updateResultsWithObjectId = await entryCollection.updateOne(
                    { _id: new ObjectId(entryId) },
                    {
                        $addToSet: { filesId: fileId.toString() },
                        $set: { recentChangeDate: new Date().toISOString() },
                        $push: { logbook: logbookEntry }
                    }
                );
                if (updateResultsWithObjectId.matchedCount === 0) {
                    await fs.promises.unlink(filePath);
                    await filesCollection.deleteOne({ _id: fileId });
                    return NextResponse.json({ error: `${entryType} not found` }, { status: 404 });
                }
            }
        }
        return NextResponse.json({ fileId: fileId.toString(), status: 200 });

    } catch (error) {
        console.error("Error during file upload:", error);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}


/**
 * Ensures that the specified directory exists, creating it if necessary
 * @param {string} dirPath - The path of the directory to check/create
 * @returns {Promise<void>}
 */
async function ensureDirectoryExists(dirPath) {
    try {
        await fs.promises.access(dirPath);
    } catch (error) {
        await fs.promises.mkdir(dirPath, { recursive: true });
    }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       required:
 *         - filename
 *         - path
 *         - size
 *         - uploadDate
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *           example: "507f1f77bcf86cd799439011"
 *         filename:
 *           type: string
 *           description: Original filename
 *           example: "spider_silk_image.jpg"
 *         path:
 *           type: string
 *           description: File storage path
 *           example: "/storage/507f1f77bcf86cd799439011_spider_silk_image.jpg"
 *         size:
 *           type: integer
 *           description: File size in bytes
 *           example: 1024000
 *         mimeType:
 *           type: string
 *           description: MIME type of the file
 *           example: "image/jpeg"
 *         uploadDate:
 *           type: string
 *           format: date-time
 *           description: When the file was uploaded
 *           example: "2024-03-15T10:30:00Z"
 *         entryType:
 *           type: string
 *           description: Type of entry this file is linked to
 *           example: "trait"
 *         entryId:
 *           type: string
 *           description: ID of the entry this file is linked to
 *           example: "507f1f77bcf86cd799439012"
 *         description:
 *           type: string
 *           description: Optional description of the file
 *           example: "SEM image of silk fiber cross-section"
 *         uploader:
 *           type: string
 *           description: ID of the user who uploaded the file
 *           example: "507f1f77bcf86cd799439013"
 *     FileUploadResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Files uploaded successfully"
 *         fileIds:
 *           type: array
 *           items:
 *             type: string
 *           description: IDs of the uploaded files
 *           example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 */

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: Retrieve all files
 *     description: Get a list of all files stored in the system with their metadata.
 *     tags:
 *       - Files
 *     responses:
 *       200:
 *         description: Successfully retrieved files
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/File'
 *       500:
 *         description: Database connection error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Upload files
 *     description: Upload one or more files to the system. Files are stored with metadata and can be linked to specific entries.
 *     tags:
 *       - Files
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Files to upload
 *               entryType:
 *                 type: string
 *                 description: Type of entry to link files to
 *                 example: "trait"
 *               deferredLink:
 *                 type: boolean
 *                 description: Whether to defer linking until later
 *                 example: true
 *               mediaType:
 *                 type: string
 *                 description: Expected media type
 *                 example: "image/jpeg"
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUploadResponse'
 *       400:
 *         description: Invalid request or file format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Upload or database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
import { NextResponse } from "next/server";
import path from "path";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { get_database_user } from "@/app/api/utils/get_database_user";
import { ObjectId } from "mongodb";
import fs from "fs/promises";

/**
 * @swagger
 * components:
 *   schemas:
 *     FileLinkRequest:
 *       type: object
 *       required:
 *         - fileId
 *         - entryType
 *         - entryId
 *       properties:
 *         fileId:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           description: MongoDB ObjectId of the file to link
 *           example: "507f1f77bcf86cd799439011"
 *         entryType:
 *           type: string
 *           enum: [sample, trait, experiment]
 *           description: Type of entry to link the file to
 *           example: "sample"
 *         entryId:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *           description: MongoDB ObjectId of the entry to link the file to
 *           example: "507f1f77bcf86cd799439012"
 */

/**
 * @swagger
 * /api/files/link:
 *   post:
 *     summary: Link a file to an entry
 *     description: |
 *       Links a file to a specific entry (sample, trait, or experiment).
 *       If the file was temporary, it will be moved to the appropriate directory structure
 *       and marked as permanent. The entry's logbook will be updated with the linking action.
 *     tags:
 *       - Files
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FileLinkRequest'
 *           examples:
 *             linkToSample:
 *               summary: Link file to a sample
 *               value:
 *                 fileId: "507f1f77bcf86cd799439011"
 *                 entryType: "sample"
 *                 entryId: "507f1f77bcf86cd799439012"
 *             linkToExperiment:
 *               summary: Link file to an experiment
 *               value:
 *                 fileId: "507f1f77bcf86cd799439011"
 *                 entryType: "experiment"
 *                 entryId: "507f1f77bcf86cd799439013"
 *     responses:
 *       200:
 *         description: File linked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing required fields"
 *       404:
 *         description: File or entry not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "File not found"
 *       500:
 *         description: Database connection error or file system error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to connect to database"
 */
export async function POST(req) {
    try {
        const { fileId, entryType, entryId } = await req.json();

        if (!fileId || !entryType || !entryId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const client = await get_or_create_client();
        if (!client) {
            return NextResponse.json({ error: "Failed to connect to database" }, { status: 500 });
        }

        const dbname = await get_database_user();
        const db = client.db(dbname);
        const filesCollection = db.collection("files");
        const entryCollection = db.collection(
            entryType === 'sample' ? 'samples' : 
            entryType === 'trait' ? 'traits' : 'experiments'
        );

        // Get file document
        const fileDoc = await filesCollection.findOne({ _id: new ObjectId(fileId) });
        if (!fileDoc) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // Get entry document
        const entryDoc = await entryCollection.findOne({ _id: new ObjectId(entryId) });
        if (!entryDoc) {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        // Move file to new location if it was temporary
        if (fileDoc.metadata.isTemporary) {
            const newPath = path.join(
                path.dirname(path.dirname(fileDoc.path)), // Remove temp/fileId
                entryType,
                entryId,
                path.basename(fileDoc.path)
            );

            await fs.mkdir(path.dirname(newPath), { recursive: true });
            await fs.rename(fileDoc.path, newPath);

            // Update file document
            await filesCollection.updateOne(
                { _id: new ObjectId(fileId) },
                { 
                    $set: { 
                        path: newPath,
                        'metadata.isTemporary': false,
                        'metadata.entryType': entryType,
                        'metadata.entryId': entryId
                    }
                }
            );
        }

        // Update entry document
        const logbookEntry = [
            `${new Date().toISOString()}`,
            `Linked file ${fileDoc.name} (${fileId})`
        ];

        await entryCollection.updateOne(
            { _id: new ObjectId(entryId) },
            { 
                $addToSet: { filesId: fileId },
                $set: { recentChangeDate: new Date().toISOString() },
                $push: { logbook: logbookEntry }
            }
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error linking file:", error);
        return NextResponse.json({ error: "Failed to link file" }, { status: 500 });
    }
}
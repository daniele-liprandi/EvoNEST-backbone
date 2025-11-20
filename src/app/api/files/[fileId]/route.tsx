/**
 * @swagger
 * /api/files/{fileId}:
 *   get:
 *     summary: Download a file by ID
 *     description: Stream and download a file from storage using its MongoDB document ID
 *     tags:
 *       - Files
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the file to download
 *     responses:
 *       200:
 *         description: File retrieved successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete a file by ID
 *     description: Remove a file from storage and its metadata from the database
 *     tags:
 *       - Files
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the file to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 *       500:
 *         description: Server error
 */

import { NextResponse } from "next/server";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { get_database_user } from "@/app/api/utils/get_database_user";
import { ObjectId } from "mongodb";
import { createReadStream } from "fs";
import { stat, unlink } from "fs/promises";
import mime from "mime-types";

export async function GET(
  request: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    // Connect to MongoDB
    const client = await get_or_create_client();
    if (!client) {
      return new NextResponse(null, { status: 500 });
    }

    const dbname = await get_database_user();
    const db = client.db(dbname);
    const filesCollection = db.collection("files");

    // Find file document
    const fileDoc = await filesCollection.findOne({
      _id: new ObjectId(params.fileId)
    });

    if (!fileDoc) {
      return new NextResponse(null, { status: 404 });
    }

    // Get file stats
    const fileStat = await stat(fileDoc.path);
    if (!fileStat.isFile()) {
      return new NextResponse(null, { status: 404 });
    }

    // Create read stream
    const fileStream = createReadStream(fileDoc.path);

    // Determine content type
    const contentType = mime.lookup(fileDoc.path) || 'application/octet-stream';

    // Create response
    const response = new NextResponse(fileStream as any);

    // Set headers
    response.headers.set('content-type', contentType);
    response.headers.set('content-length', fileStat.size.toString());

    // If it's an image, enable caching
    if (contentType.startsWith('image/')) {
      response.headers.set('cache-control', 'public, max-age=31536000'); // Cache for 1 year
    }

    return response;

  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    // Connect to MongoDB
    const client = await get_or_create_client();
    if (!client) {
      return new NextResponse(JSON.stringify({ error: "Database connection failed" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const dbname = await get_database_user();
    const db = client.db(dbname);
    const filesCollection = db.collection("files");

    console.log('Deleting file:', params.fileId);

    // Find file document to get metadata
    const fileDoc = await filesCollection.findOne({
      _id: new ObjectId(params.fileId)
    });

    if (!fileDoc) {
      return new NextResponse(JSON.stringify({ error: "File not found: " + params.fileId }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the entry type and ID from metadata
    const { entryType, entryId } = fileDoc.metadata;
    const entryCollection = db.collection(entryType === 'sample' ? 'samples' : 'traits');

    // Delete physical file
    try {
      await unlink(fileDoc.path);
    } catch (error) {
      console.error('Error deleting physical file:', error);
      // Continue with database cleanup even if physical file deletion fails
    }

    // Delete file document from database
    await filesCollection.deleteOne({ _id: new ObjectId(params.fileId) });

    const logbookEntry = [`${new Date().toISOString()}`, `Deleted file ${fileDoc.name} from ${entryType} ${entryId}`];

    // Update the entry document to remove the fileId
    const updateentry = await entryCollection.updateOne(
      { _id: new ObjectId(entryId) },
      {
        $pull: { filesId: params.fileId },
        $set: { recentChangeDate: new Date().toISOString() },
        $push: { logbook: logbookEntry }
      }
    );

    if (updateentry.modifiedCount === 0) {
      console.error('Error updating entry document');
    } else {
      console.log('Entry document updated');
    }

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return new NextResponse(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
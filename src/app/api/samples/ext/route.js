/**
 * @swagger
 * /api/samples/ext:
 *   get:
 *     summary: Export samples data with API key authentication
 *     description: Export all samples from a database using API key authentication. Supports various filtering and relationship inclusion options.
 *     tags:
 *       - Samples
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: database
 *         required: true
 *         schema:
 *           type: string
 *         description: Database name to export from
 *       - in: query
 *         name: apiKey
 *         schema:
 *           type: string
 *         description: API key for authentication (can also use Authorization header)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           default: json
 *         description: Export format (only JSON supported)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [animal, silk, other]
 *         description: Filter samples by type
 *       - in: query
 *         name: includeRelated
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include parent sample data chain
 *     responses:
 *       200:
 *         description: Samples exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *       404:
 *         description: No samples found
 *       500:
 *         description: Server error
 */

import { NextResponse } from 'next/server';
import { get_or_create_client } from '@/app/api/utils/mongodbClient';
import { authenticateExportRequest } from '@/app/api/utils/apiKeyAuth';
import { ObjectId } from 'mongodb';

async function getSampleChain(db, sampleId) {
    const samples = db.collection("samples");
    const chain = [];
    let currentId = sampleId;
    
    while (currentId) {
        const queryId = typeof currentId === 'string' ? new ObjectId(currentId) : currentId;
        const sample = await samples.findOne({ _id: queryId });
        if (!sample) break;
        chain.push(sample);
        currentId = sample.parentId;
    }
    
    return chain;
}

export async function GET(req) {
    try {
        // Authenticate the request
        const authResult = await authenticateExportRequest(req);
        if (!authResult.valid) {
            return new NextResponse(
                JSON.stringify({ error: authResult.error }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { searchParams } = new URL(req.url);
        const format = searchParams.get('format') || 'json';
        const type = searchParams.get('type');
        const includeRelated = searchParams.get('includeRelated') === 'true';

        // Only JSON export is supported
        if (format && format.toLowerCase() !== 'json') {
            return new NextResponse(
                JSON.stringify({ error: 'Only JSON export is supported. Please request format=json or omit the format parameter.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Connect to database
        const client = await get_or_create_client();
        if (!client) {
            return new NextResponse(
                JSON.stringify({ error: "Failed to connect to database" }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const db = client.db(authResult.database);
        const samplesCollection = db.collection("samples");

        // Build query
        const query = type ? { type: type } : {};

        // Fetch samples
        let samplesData = await samplesCollection.find(query).toArray();

        if (samplesData.length === 0) {
            return new NextResponse(
                JSON.stringify({ error: "No samples found" }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Include related parent sample data if requested
        if (includeRelated) {
            for (const sample of samplesData) {
                if (sample.parentId) {
                    const parentChain = await getSampleChain(db, sample.parentId);
                    sample.parentChain = parentChain;
                }
            }
        }

        // Return the data
        return new NextResponse(JSON.stringify({
            database: authResult.database,
            exportDate: new Date().toISOString(),
            totalSamples: samplesData.length,
            filters: {
                type: type || 'all',
                includeRelated: includeRelated
            },
            samples: samplesData
        }, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="samples_${authResult.database}_${new Date().toISOString().split('T')[0]}.json"`
            }
        });

    } catch (error) {
        console.error("Error exporting samples:", error);
        return new NextResponse(
            JSON.stringify({ error: "Internal server error", details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

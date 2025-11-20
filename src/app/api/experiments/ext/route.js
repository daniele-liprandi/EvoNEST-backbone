/**
 * @swagger
 * /api/experiments/ext:
 *   get:
 *     summary: Export experiments data with API key authentication
 *     description: Export all experiments from a database using API key authentication. Supports filtering and inclusion of raw data and related samples.
 *     tags:
 *       - Experiments
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
 *         description: Filter experiments by type
 *       - in: query
 *         name: includeRawData
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include raw experimental data
 *       - in: query
 *         name: includeOriginalData
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include original unprocessed data
 *       - in: query
 *         name: includeRelated
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include related sample data chain
 *     responses:
 *       200:
 *         description: Experiments exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *       404:
 *         description: No experiments found
 *       500:
 *         description: Server error
 */

import { NextResponse } from 'next/server';
import { get_or_create_client } from '@/app/api/utils/mongodbClient';
import { authenticateExportRequest } from '@/app/api/utils/apiKeyAuth';
import { exportExperimentsToStructuredFormat } from '@/utils/exporters/json-exporter';
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
        const includeRawData = searchParams.get('includeRawData') === 'true';
        const includeOriginalData = searchParams.get('includeOriginalData') === 'true';
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
        const experimentsCollection = db.collection("experiments");

        // Build query
        const query = type ? { type: type } : {};
        
        // Build projection - only exclude heavy data fields if raw data is NOT requested
        // includeRelated (samples/traits) doesn't need rawdata, so we can exclude it
        const projection = includeRawData ? {} : { 
            rawdata: 0, 
            originalData: 0
        };

        // Fetch experiments
        let experiments = await experimentsCollection.find(query, { projection }).toArray();

        if (experiments.length === 0) {
            return new NextResponse(
                JSON.stringify({ error: "No experiments found" }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Include related sample data if requested (independent of raw data)
        if (includeRelated) {
            const traits = db.collection("traits");
            
            for (const experiment of experiments) {
                if (experiment.sampleId) {
                    const sampleChain = await getSampleChain(db, experiment.sampleId);
                    experiment.sampleChain = sampleChain;
                    
                    // Get associated traits
                    const associatedTraits = await traits.find({ 
                        sampleId: experiment.sampleId 
                    }).toArray();
                    experiment.associatedTraits = associatedTraits;
                }
            }
        }

        // Handle raw data selection ONLY if raw data is requested
        if (includeRawData) {
            experiments.forEach(experiment => {
                if (includeOriginalData && experiment.originalData) {
                    experiment.data = experiment.originalData;
                    experiment.isOriginalData = true;
                } else if (!experiment.data && experiment.rawdata) {
                    experiment.data = experiment.rawdata;
                    experiment.isOriginalData = false;
                }
            });
        }

        // Use the json-exporter to create structured format
        const structuredData = exportExperimentsToStructuredFormat(experiments);
        
        // Add related data to each experiment if requested
        if (includeRelated) {
            Object.keys(structuredData.experiments).forEach((expId, index) => {
                const originalExperiment = experiments[index];
                if (originalExperiment.sampleChain) {
                    structuredData.experiments[expId].sampleChain = originalExperiment.sampleChain;
                }
                if (originalExperiment.associatedTraits) {
                    structuredData.experiments[expId].associatedTraits = originalExperiment.associatedTraits;
                }
            });
        }

        // Remove rawData if not requested
        if (!includeRawData) {
            Object.keys(structuredData.experiments).forEach(expId => {
                delete structuredData.experiments[expId].rawData;
            });
        }
        
        // Add metadata about the export
        structuredData.metadata.database = authResult.database;
        structuredData.metadata.filters = {
            type: type || 'all',
            includeRawData: includeRawData,
            includeOriginalData: includeOriginalData,
            includeRelated: includeRelated
        };

        // Return the data
        return new NextResponse(JSON.stringify(structuredData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="experiments_${authResult.database}_${new Date().toISOString().split('T')[0]}.json"`
            }
        });

    } catch (error) {
        console.error("Error exporting experiments:", error);
        return new NextResponse(
            JSON.stringify({ error: "Internal server error", details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

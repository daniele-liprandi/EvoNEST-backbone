/**
 * API endpoint for exporting traits data using API key authentication
 * GET /api/traits/export
 * 
 * Query parameters:
 * - database: (required) Database name to export from
 * - apiKey: (optional) API key for authentication (can also use Authorization header)
 * - format: 'json' (default: 'json')
 * - type: Filter traits by type
 * - includeSampleFeatures: Include associated sample information (true/false)
 * - includeRelated: Include related sample chain data (true/false)
 * 
 * Authentication:
 * - API key via Authorization header: "Bearer <api-key>"
 * - API key via X-API-Key header: "<api-key>"
 * - API key via query parameter: ?apiKey=<api-key>
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

function parseNFibres(nfibres) {
    if (!nfibres) return { error: "Missing nfibres value" };

    if (nfibres.toLowerCase() === "bundle") {
        return { type: "single", value: 1 };
    }

    if (nfibres.includes("-")) {
        const [min, max] = nfibres.split("-").map((num) => parseInt(num.trim()));
        if (isNaN(min) || isNaN(max)) {
            return { error: "Invalid range format" };
        }
        return {
            type: "range",
            min: min,
            max: max,
            avg: (min + max) / 2,
        };
    }

    const value = parseInt(nfibres);
    if (isNaN(value)) {
        return { error: "Invalid number format" };
    }
    return { type: "single", value };
}

function calculateArea(diameter, count) {
    return ((Math.PI * diameter * diameter) / 4) * count;
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
        const includeSampleFeatures = searchParams.get('includeSampleFeatures') === 'true';
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
        const traitsCollection = db.collection("traits");

        // Build query
        const query = type ? { type: type } : {};

        // Fetch traits
        let traitsData = await traitsCollection.find(query).toArray();

        if (traitsData.length === 0) {
            return new NextResponse(
                JSON.stringify({ error: "No traits found" }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Include sample features if requested
        if (includeSampleFeatures) {
            const samples = db.collection("samples");
            const samplesData = await samples.find().toArray();
            const samplesMap = new Map(samplesData.map(s => [s._id.toString(), s]));
            
            traitsData.forEach((trait) => {
                const sampleId = trait.sampleId?.toString();
                if (sampleId && samplesMap.has(sampleId)) {
                    trait.sample = samplesMap.get(sampleId);
                }
            });
        }

        // Include related sample chain data if requested
        if (includeRelated) {
            for (const trait of traitsData) {
                if (trait.sampleId) {
                    const sampleChain = await getSampleChain(db, trait.sampleId);
                    trait.sampleChain = sampleChain;
                }
            }
        }

        // Calculate cross sections for diameter traits if present
        const crossSectionTraits = [];
        traitsData.forEach((trait) => {
            if (trait.type === "diameter" && trait.measurement) {
                const nfibresInfo = parseNFibres(trait.nfibres || "1");
                
                if (!nfibresInfo.error) {
                    if (nfibresInfo.type === "range") {
                        // Create entries for min, max, and avg
                        const minArea = calculateArea(trait.measurement, nfibresInfo.min);
                        const maxArea = calculateArea(trait.measurement, nfibresInfo.max);
                        const avgArea = calculateArea(trait.measurement, nfibresInfo.avg);
                        
                        crossSectionTraits.push({
                            ...trait,
                            type: "cross-section-min",
                            measurement: minArea,
                            unit: "μm²",
                            nfibres: nfibresInfo.min.toString(),
                            derivedFrom: trait._id
                        });
                        
                        crossSectionTraits.push({
                            ...trait,
                            type: "cross-section-max",
                            measurement: maxArea,
                            unit: "μm²",
                            nfibres: nfibresInfo.max.toString(),
                            derivedFrom: trait._id
                        });
                        
                        crossSectionTraits.push({
                            ...trait,
                            type: "cross-section-avg",
                            measurement: avgArea,
                            unit: "μm²",
                            nfibres: nfibresInfo.avg.toString(),
                            derivedFrom: trait._id
                        });
                    } else {
                        // Single value
                        const area = calculateArea(trait.measurement, nfibresInfo.value);
                        crossSectionTraits.push({
                            ...trait,
                            type: "cross-section",
                            measurement: area,
                            unit: "μm²",
                            nfibres: nfibresInfo.value.toString(),
                            derivedFrom: trait._id
                        });
                    }
                }
            }
        });

        // Add cross-section traits to the data
        traitsData = traitsData.concat(crossSectionTraits);

        // Return the data
        return new NextResponse(JSON.stringify({
            database: authResult.database,
            exportDate: new Date().toISOString(),
            totalTraits: traitsData.length,
            originalTraits: traitsData.length - crossSectionTraits.length,
            derivedTraits: crossSectionTraits.length,
            filters: {
                type: type || 'all',
                includeSampleFeatures: includeSampleFeatures,
                includeRelated: includeRelated
            },
            traits: traitsData
        }, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="traits_${authResult.database}_${new Date().toISOString().split('T')[0]}.json"`
            }
        });

    } catch (error) {
        console.error("Error exporting traits:", error);
        return new NextResponse(
            JSON.stringify({ error: "Internal server error", details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

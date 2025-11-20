/**
 * @swagger
 * /api/traits/analysis:
 *   post:
 *     summary: Perform statistical analysis on trait data
 *     description: Analyze trait measurements with statistical calculations (mean, stddev, min, max, median) grouped by various sample features
 *     tags:
 *       - Traits
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - traitType
 *             properties:
 *               traitType:
 *                 type: string
 *                 description: Type of trait to analyze (e.g., stressAtBreak, diameter, toughness)
 *               groupBy:
 *                 type: string
 *                 default: all
 *                 description: Field to group results by (e.g., species, sex, sampleType)
 *               filters:
 *                 type: object
 *                 description: Optional filters to apply to the data
 *               unitConversion:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to apply unit conversions
 *     responses:
 *       200:
 *         description: Analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       group:
 *                         type: string
 *                       statistics:
 *                         type: object
 *                         properties:
 *                           mean:
 *                             type: number
 *                           stddev:
 *                             type: number
 *                           min:
 *                             type: number
 *                           max:
 *                             type: number
 *                           median:
 *                             type: number
 *                           count:
 *                             type: number
 *                 processingTime:
 *                   type: number
 *                   description: Time taken for analysis in milliseconds
 *       400:
 *         description: Bad request - Missing or invalid parameters
 *       500:
 *         description: Server error
 */

import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { NextResponse } from "next/server";
import { get_database_user } from "../../utils/get_database_user";


// TODO - It should be possible to select which traits are shown from the editable public traits list

function getDisplayUnit(traitType) {
    switch (traitType) {
        case 'stressAtBreak':
        case 'toughness':
        case 'modulus':
            return 'GPa';
        case 'loadAtBreak':
            return 'mN';
        case 'strainAtBreak':
            return '%';
        case 'diameter':
            return 'μm';
        default:
            return '';
    }
}

// Calculate statistical measures
function calculateStatistics(values) {
    // Filter out null, undefined, and non-numeric values
    const validValues = values.filter(val => val !== null && val !== undefined && !isNaN(val));
    
    if (validValues.length === 0) return null;
    
    const sortedValues = [...validValues].sort((a, b) => a - b);
    const count = validValues.length;
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;
    
    // Standard deviation
    const variance = validValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
    const stddev = Math.sqrt(variance);
    
    // Min, max, median
    const min = sortedValues[0];
    const max = sortedValues[count - 1];
    const median = count % 2 === 0 
        ? (sortedValues[count / 2 - 1] + sortedValues[count / 2]) / 2 
        : sortedValues[Math.floor(count / 2)];
    
    return {
        mean: parseFloat(mean.toFixed(3)),
        stddev: parseFloat(stddev.toFixed(3)),
        min: parseFloat(min.toFixed(3)),
        max: parseFloat(max.toFixed(3)),
        median: parseFloat(median.toFixed(3)),
        count
    };
}

export async function POST(req) {
    try {
        const startTime = Date.now();
        const data = await req.json();
        
        const {
            traitType,
            groupBy = 'all',
            filters = {},
            unitConversion = true
        } = data;

        // Validate required parameters
        if (!traitType) {
            return NextResponse.json({ error: "traitType is required" }, { status: 400 });
        }

        // Connect to database
        const client = await get_or_create_client();
        if (!client) {
            return NextResponse.json({ error: "Failed to connect to database" }, { status: 500 });
        }

        const dbname = await get_database_user();
        const db = client.db(dbname);
        const traits = db.collection("traits");
        const samples = db.collection("samples");

        // Build aggregation pipeline
        const pipeline = [];

        // Match traits by type
        pipeline.push({
            $match: { type: traitType }
        });

        // Convert sampleId to ObjectId for proper lookup (handle both string and ObjectId types)
        pipeline.push({
            $addFields: {
                sampleObjectId: {
                    $cond: {
                        if: { 
                            $and: [
                                { $ne: ["$sampleId", ""] },
                                { $ne: ["$sampleId", null] }
                            ]
                        },
                        then: {
                            $cond: {
                                if: { $eq: [{ $type: "$sampleId" }, "objectId"] },
                                then: "$sampleId", // Already an ObjectId
                                else: {
                                    $cond: {
                                        if: { 
                                            $and: [
                                                { $eq: [{ $type: "$sampleId" }, "string"] },
                                                { $eq: [{ $strLenCP: "$sampleId" }, 24] }
                                            ]
                                        },
                                        then: { $toObjectId: "$sampleId" }, // Convert string to ObjectId
                                        else: null
                                    }
                                }
                            }
                        },
                        else: null
                    }
                }
            }
        });

        // Filter out traits without valid sampleIds
        pipeline.push({
            $match: {
                sampleObjectId: { $ne: null }
            }
        });

        // Join with samples to get sample information
        pipeline.push({
            $lookup: {
                from: "samples",
                localField: "sampleObjectId",
                foreignField: "_id",
                as: "sample"
            }
        });

        // Unwind the sample array (should be only one match)
        pipeline.push({
            $unwind: "$sample"
        });

        // Build match conditions for filters
        const matchConditions = {};
        const orConditions = [];        // Filter by sample subtypes (silktype from sample - renamed for generic use)
        if (filters.sampleSubtypes && filters.sampleSubtypes.length > 0) {
            const hasNotDeclared = filters.sampleSubtypes.includes('__NOT_DECLARED__');
            const regularSubtypes = filters.sampleSubtypes.filter(st => st !== '__NOT_DECLARED__');
            
            if (hasNotDeclared && regularSubtypes.length > 0) {
                // Include both regular values and null/empty values
                orConditions.push({
                    $or: [
                        { "sample.silktype": { $in: regularSubtypes } },
                        { "sample.silktype": null },
                        { "sample.silktype": "" },
                        { "sample.silktype": { $exists: false } }
                    ]
                });
            } else if (hasNotDeclared) {
                // Only null/empty values
                orConditions.push({
                    $or: [
                        { "sample.silktype": null },
                        { "sample.silktype": "" },
                        { "sample.silktype": { $exists: false } }
                    ]
                });
            } else {
                // Only regular values
                matchConditions["sample.silktype"] = { $in: regularSubtypes };
            }
        }

        // Filter by nfibres (case-insensitive)
        if (filters.nfibres && filters.nfibres.length > 0) {
            const hasNotDeclared = filters.nfibres.includes('__NOT_DECLARED__');
            const regularNFibres = filters.nfibres.filter(nf => nf !== '__NOT_DECLARED__');
            
            if (hasNotDeclared && regularNFibres.length > 0) {
                // Include both regular values and null/empty values
                const nfibresRegex = regularNFibres.map(nf => new RegExp(`^${nf}$`, 'i'));
                orConditions.push({
                    $or: [
                        { nfibres: { $in: nfibresRegex } },
                        { nfibres: null },
                        { nfibres: "" },
                        { nfibres: { $exists: false } }
                    ]
                });
            } else if (hasNotDeclared) {
                // Only null/empty values
                orConditions.push({
                    $or: [
                        { nfibres: null },
                        { nfibres: "" },
                        { nfibres: { $exists: false } }
                    ]
                });
            } else {
                // Only regular values
                const nfibresRegex = regularNFibres.map(nf => new RegExp(`^${nf}$`, 'i'));
                matchConditions.nfibres = { $in: nfibresRegex };
            }
        }        // Combine regular conditions and OR conditions
        if (orConditions.length > 0) {
            if (orConditions.length === 1) {
                // If there's only one OR condition, use it directly
                Object.assign(matchConditions, orConditions[0]);
            } else {
                // If there are multiple OR conditions, combine them with $and
                matchConditions.$and = orConditions;
            }
        }

        // Apply filters if any
        if (Object.keys(matchConditions).length > 0) {
            pipeline.push({
                $match: matchConditions
            });
        }

        // Add computed fields for grouping
        pipeline.push({
            $addFields: {
                fullSpecies: {
                    $cond: {
                        if: { $and: ["$sample.genus", "$sample.species"] },
                        then: { $concat: ["$sample.genus", " ", "$sample.species"] },
                        else: {
                            $cond: {
                                if: "$sample.genus",
                                then: "$sample.genus",
                                else: {
                                    $cond: {
                                        if: "$sample.species",
                                        then: "$sample.species",
                                        else: "Unknown"
                                    }
                                }
                            }
                        }
                    }
                },               
                fullSpeciesSubsampletype: {
                    $concat: [
                        {
                            $cond: {
                                if: { $and: ["$sample.genus", "$sample.species"] },
                                then: { $concat: ["$sample.genus", " ", "$sample.species"] },
                                else: {
                                    $cond: {
                                        if: "$sample.genus",
                                        then: "$sample.genus",
                                        else: {
                                            $cond: {
                                                if: "$sample.species",
                                                then: "$sample.species",
                                                else: "Unknown"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        " - ",
                        {
                            $cond: {
                                if: "$sample.silktype",
                                then: "$sample.silktype",
                                else: "Unknown"
                            }
                        }
                    ]
                },
                convertedValue: unitConversion 
                    ? {
                        $cond: {
                            if: { $in: [traitType, ["stressAtBreak", "toughness", "modulus"]] },
                            then: { $divide: ["$measurement", 1000000000] }, // Convert Pa to GPa
                            else: {
                                $cond: {
                                    if: { $eq: [traitType, "strainAtBreak"] },
                                    then: { $multiply: ["$measurement", 100] }, // Convert to percentage
                                    else: "$measurement"
                                }
                            }
                        }
                    }
                    : "$measurement"
            }
        });

        // Debug: Add a stage to see what data we have before grouping
        // console.log('Pipeline before grouping:', JSON.stringify(pipeline, null, 2));        // Group by the specified field
        let groupField;
        switch (groupBy) {
            case 'family':
                groupField = "$sample.family";
                break;
            case 'genus':
                groupField = "$sample.genus";
                break;
            case 'species':
                groupField = "$sample.species";
                break;
            case 'fullSpecies':
                groupField = "$fullSpecies";
                break;
            case 'sampleSubTypes':
                groupField = "$sample.silktype";
                break;
            case 'fullSpeciesSubsampletype':
                groupField = "$fullSpeciesSubsampletype";
                break;
            case 'all':
            default:
                groupField = "All";
                break;
        }

        if (groupBy === 'all') {
            // For 'all', we don't group, just collect all values
            pipeline.push({
                $group: {
                    _id: "All",
                    values: { $push: "$convertedValue" },
                    count: { $sum: 1 }
                }
            });
        } else {
            // Group by the specified field
            pipeline.push({
                $group: {
                    _id: groupField,
                    values: { $push: "$convertedValue" },
                    count: { $sum: 1 }
                }
            });
        }

        // Sort by group name
        pipeline.push({
            $sort: { _id: 1 }
        });

        // Execute aggregation
        const aggregationResults = await traits.aggregate(pipeline).toArray();
        
        

        // Process results and calculate statistics
        const results = aggregationResults.map(group => {
            const stats = calculateStatistics(group.values);
            
            // Handle case where stats is null (no values)
            if (!stats) {
                const baseResult = {
                    name: group._id || 'Unknown',
                    mean: 0,
                    stddev: 0,
                    min: 0,
                    max: 0,
                    median: 0,
                    count: 0
                };
                  // For fullSpeciesSubsampletype grouping, split the name
                if (groupBy === 'fullSpeciesSubsampletype' && group._id && group._id.includes(' - ')) {
                    const [speciesName, subType] = group._id.split(' - ');
                    baseResult.name = speciesName;
                    baseResult.sampleSubTypes = subType;
                }
                
                return baseResult;
            }
            
            const baseResult = {
                name: group._id || 'Unknown',
                ...stats
            };
              // For fullSpeciesSubsampletype grouping, split the name into separate fields
            if (groupBy === 'fullSpeciesSubsampletype' && group._id && group._id.includes(' - ')) {
                const [speciesName, subType] = group._id.split(' - ');
                baseResult.name = speciesName;
                baseResult.sampleSubTypes = subType;
            }
            
            return baseResult;
        }).filter(result => result.count > 0); // Only include groups with data

        // Get metadata
        const totalTraits = await traits.countDocuments({ type: traitType });
        const filteredTraits = results.reduce((sum, result) => sum + result.count, 0);
        const processingTime = `${Date.now() - startTime}ms`;

        return NextResponse.json({
            results,
            unit: unitConversion ? getDisplayUnit(traitType) : '',
            metadata: {
                totalTraits,
                filteredTraits,
                processingTime,
                groupBy,
                traitType
            }
        });

    } catch (error) {
        console.error('Analysis API error:', error);
        return NextResponse.json(
            { error: "Internal server error", details: error.message }, 
            { status: 500 }
        );
    }
}

// GET endpoint to fetch available filter options
export async function GET(req) {
    try {
        const client = await get_or_create_client();
        if (!client) {
            return NextResponse.json({ error: "Failed to connect to database" }, { status: 500 });
        }

        const dbname = await get_database_user();
        const db = client.db(dbname);
        const traits = db.collection("traits");
        const samples = db.collection("samples");

        // Get available trait types
        const traitTypes = await traits.distinct("type");        // Get available sample subtypes (using silktype field but renamed for generic use)
        const sampleSubTypes = await samples.distinct("silktype");

        // Get available nfibres values
        const nfibresValues = await traits.distinct("nfibres");
        const cleanNFibres = [...new Set(
            nfibresValues
                .filter(Boolean)
                .map(value => value.toString().toLowerCase())
        )].sort();

        return NextResponse.json({
            traitTypes: traitTypes.sort(),
            sampleSubTypes: sampleSubTypes.filter(Boolean).sort(),
            nfibres: cleanNFibres
        });

    } catch (error) {
        console.error('Analysis filters API error:', error);
        return NextResponse.json(
            { error: "Internal server error", details: error.message }, 
            { status: 500 }
        );
    }
}

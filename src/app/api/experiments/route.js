import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { get_database_user } from "../utils/get_database_user";
import fs from 'fs/promises';

/**
 * @swagger
 * components:
 *   schemas:
 *     Experiment:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - responsible
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           description: Experiment name
 *           example: "Silk tensile strength study"
 *         type:
 *           type: string
 *           description: Type of experiment
 *           example: "mechanical_test"
 *         description:
 *           type: string
 *           description: Detailed description of the experiment
 *           example: "Testing the tensile strength of spider silk under various conditions"
 *         responsible:
 *           type: string
 *           description: ID of the user responsible for this experiment
 *           example: "507f1f77bcf86cd799439013"
 *         date:
 *           type: string
 *           format: date
 *           description: Experiment date
 *           example: "2024-03-15"
 *         samples:
 *           type: array
 *           items:
 *             type: string
 *           description: List of sample IDs used in this experiment
 *           example: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439014"]
 *         status:
 *           type: string
 *           enum: [planned, running, completed, failed]
 *           description: Current status of the experiment
 *           example: "completed"
 *         equipment:
 *           type: string
 *           description: Equipment used for the experiment
 *           example: "Instron 5544"
 *         conditions:
 *           type: object
 *           description: Environmental or experimental conditions
 *           example:
 *             temperature: "22°C"
 *             humidity: "55%"
 *             strain_rate: "0.1 mm/min"
 *         rawdata:
 *           type: object
 *           description: Raw experimental data (included when includeRawData=true)
 *           properties:
 *             data:
 *               type: array
 *               description: Experimental data points
 *             metadata:
 *               type: object
 *               description: Metadata about the data collection
 *         isOriginalData:
 *           type: boolean
 *           description: Whether the returned data is original (unprocessed)
 *           example: false
 *         recentChangeDate:
 *           type: string
 *           format: date-time
 *           description: Last modification date
 *           example: "2024-03-15T14:20:00Z"
 *     ExperimentCreateRequest:
 *       type: object
 *       required:
 *         - method
 *         - name
 *         - type
 *         - responsible
 *       properties:
 *         method:
 *           type: string
 *           enum: [create]
 *           description: Action to perform
 *           example: "create"
 *         name:
 *           type: string
 *           description: Experiment name
 *           example: "Silk tensile strength study"
 *         type:
 *           type: string
 *           description: Type of experiment
 *           example: "mechanical_test"
 *         description:
 *           type: string
 *           description: Detailed description of the experiment
 *           example: "Testing the tensile strength of spider silk under various conditions"
 *         responsible:
 *           type: string
 *           description: ID of the user responsible for this experiment
 *           example: "507f1f77bcf86cd799439013"
 *         date:
 *           type: string
 *           format: date
 *           description: Experiment date
 *           example: "2024-03-15"
 *         samples:
 *           type: array
 *           items:
 *             type: string
 *           description: List of sample IDs used in this experiment
 *           example: ["507f1f77bcf86cd799439012"]
 *         equipment:
 *           type: string
 *           description: Equipment used for the experiment
 *           example: "Instron 5544"
 *         conditions:
 *           type: object
 *           description: Environmental or experimental conditions
 */

/**
 * @swagger
 * /api/experiments:
 *   get:
 *     summary: Retrieve experiments
 *     description: Get a list of experiments with optional inclusion of raw experimental data and filtering options.
 *     tags:
 *       - Experiments
 *     parameters:
 *       - in: query
 *         name: includeRawData
 *         schema:
 *           type: boolean
 *         description: Include raw experimental data in the response
 *         example: true
 *       - in: query
 *         name: includeOriginalData
 *         schema:
 *           type: boolean
 *         description: Include original (unprocessed) data instead of current data
 *         example: false
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter experiments by type
 *         example: "mechanical_test"
 *     responses:
 *       200:
 *         description: Successfully retrieved experiments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Experiment'
 *       500:
 *         description: Database connection error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create, update, or delete experiments
 *     description: |
 *       Handles multiple experiment operations based on the method field:
 *       - **create**: Add a new experiment
 *       - **update**: Modify an existing experiment
 *       - **delete**: Remove an experiment
 *       - **addRawData**: Add raw data to an experiment
 *       - **processData**: Process raw experimental data
 *     tags:
 *       - Experiments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/ExperimentCreateRequest'
 *           examples:
 *             createExperiment:
 *               summary: Create a new experiment
 *               value:
 *                 method: "create"
 *                 name: "Silk tensile strength study"
 *                 type: "mechanical_test"
 *                 description: "Testing the tensile strength of spider silk"
 *                 responsible: "507f1f77bcf86cd799439013"
 *                 date: "2024-03-15"
 *                 samples: ["507f1f77bcf86cd799439012"]
 *                 equipment: "Instron 5544"
 *     responses:
 *       200:
 *         description: Experiment operation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Experiment created successfully"
 *                 id:
 *                   type: string
 *                   description: Experiment ID (for create operations)
 *                   example: "507f1f77bcf86cd799439011"
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Experiment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Database connection or server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// TODO Add instructions on how to use this to generate traits

/**
 * Fetches the complete chain of parent samples from a given sample up to the root
 * @param {Object} db - Database connection
 * @param {string|ObjectId} sampleId - Starting sample ID
 * @returns {Array} Array of samples from child to root
 */
async function getSampleChain(db, sampleId) {
    const samples = db.collection("samples");
    const chain = [];
    let currentId = sampleId;
    
    while (currentId) {
        // Convert to ObjectId only if it's a string
        const queryId = typeof currentId === 'string' ? new ObjectId(currentId) : currentId;
        const sample = await samples.findOne({ _id: queryId });
        if (!sample) break;
        chain.push(sample);
        currentId = sample.parentId;
    }
    
    return chain;
}

async function getExperiments(client, includeRawData = false, type = "", includeOriginalData = false, includeRelated = false, includeTraitsData = false) {
    const dbname = await get_database_user();
    const db = client.db(dbname);

    const query = type ? { type: type } : {};
    
    // Build projection based on what data is requested
    let projection = {};
    if (includeRawData) {
        // Include everything
        projection = {};
    } else if (includeTraitsData) {
        // Include only data.traits and data.textFields, exclude channelData and rawdata
        projection = { 
            rawdata: 0,
            originalData: 0,
            metadata: 0,
            'data.channelData': 0,
            'data.summary': 0
        };
    } else {
        // Exclude all data fields
        projection = { 
            rawdata: 0, 
            data: 0, 
            originalData: 0, 
            metadata: 0
        };
    }
    
    let experiments = await db.collection("experiments").find(query, { projection }).toArray();

    if (includeRawData && includeOriginalData) {
        // Add flag to indicate which data is being returned
        experiments.forEach(experiment => {
            experiment.isOriginalData = true;
            if (experiment.originalData) {
                experiment.rawdata = experiment.originalData;
            }
        });
    } else if (includeRawData) {
        experiments.forEach(experiment => {
            experiment.isOriginalData = false;
            if (experiment.data) {
                experiment.rawdata = experiment.data;
            }
        });
    }

    // Include related sample data and traits if requested
    if (includeRelated) {
        const traits = db.collection("traits");
        
        for (const experiment of experiments) {
            if (experiment.sampleId) {
                // Get complete sample chain (from child to root)
                const sampleChain = await getSampleChain(db, experiment.sampleId);
                experiment.sampleChain = sampleChain;
                
                // Add direct sample info at top level for convenience
                if (sampleChain.length > 0) {
                    const directSample = sampleChain[0];
                    experiment.sample = directSample;
                }
                
                // Get all traits for this experiment's sample only (not parent samples)
                const sampleTraits = await traits.find({ sampleId: experiment.sampleId }).toArray();
                experiment.traits = sampleTraits;
            }
        }
    }

    return experiments;
}

// In the GET handler:
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const includeRawData = searchParams.get('includeRawData') === 'true';
        const includeOriginalData = searchParams.get('includeOriginalData') === 'true';
        const includeRelated = searchParams.get('related') === 'true';
        const includeTraitsData = searchParams.get('includeTraitsData') === 'true';
        const type = searchParams.get('type');

        const client = await get_or_create_client();
        if (client == null) {
            return new NextResponse(JSON.stringify({ error: "Failed to connect to database" }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const experiments = await getExperiments(client, includeRawData, type, includeOriginalData, includeRelated, includeTraitsData);
        return NextResponse.json(experiments);
    } catch (error) {
        console.error("Error fetching experiments:", error);
        return new NextResponse(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function POST(req) {
    const data = await req.json();
    const method = data.method;
    const client = await get_or_create_client();

    if (client == null) {
        return new NextResponse(JSON.stringify({ error: "Failed to connect to database" }), { status: 500 });
    }

    const dbname = await get_database_user();
    const db = client.db(dbname);
    const experiments = db.collection("experiments");
    const samples = db.collection("samples");
    const files = db.collection("files");

    if (method === "create") {
        // Check if sampleId is provided
        if (!data.sampleId) {
            return new NextResponse(JSON.stringify({ error: "Sample ID is empty or wrong. Please put the correct Sample ID." }), { status: 400 });
        }

        // Check if the responsible user exists
        const users = client.db("usersdb").collection("users");
        const responsibleUser = await users.findOne({ _id: new ObjectId(data.responsible) });

        if (responsibleUser == null) {
            return new NextResponse(JSON.stringify({ error: "Responsible not found" }), { status: 400 });
        }

        // Handle structured experiment data (from updated parsers)
        let experimentData;
        let embeddedTraits = [];

        if (data.data && typeof data.data === 'object' && data.name && data.type) {
            // New structured format: data comes pre-structured from parsers
            experimentData = {
                ...data, // This includes all the ExperimentAPIData fields
                version: data.version || 1,
                recentChangeDate: new Date().toISOString(),
                logbook: data.logbook || [[`${new Date().toISOString()}`, `Created experiment ${data.name}`]],
            };

            // Extract embedded traits for separate insertion
            if (data.traits && Array.isArray(data.traits)) {
                embeddedTraits = data.traits.map(trait => ({
                    ...trait,
                    experimentId: null, // Will be set after experiment creation
                    createdAt: new Date().toISOString()
                }));
                
                // Remove traits from experiment data to avoid duplication
                delete experimentData.traits;
            }

            
            
        } else {
            // Legacy format: create basic experiment structure
            experimentData = {
                name: data.name,
                sampleId: data.sampleId,
                responsible: data.responsible,
                type: data.type,
                date: data.date,
                notes: data.notes,
                filename: data.filename,
                filepath: data.filepath,
                fileId: data.fileId,
                version: 1,
                conversionHistory: [],
                recentChangeDate: new Date().toISOString(),
                logbook: [[`${new Date().toISOString()}`, `Uploaded experiment ${data.name}`]],
                window: data.window,
                // Embed rawdata directly into the experiment document
                data: data.dataFields,
                originalData: data.dataFields, // Store original data on creation
                metadata: data.metadata,
            };

            
        }

        // Insert the experiment
        const experimentResult = await experiments.insertOne(experimentData);
        
        if (!experimentResult.insertedId) {
            return new NextResponse(JSON.stringify({ error: "Failed to create experiment" }), { status: 500 });
        }

        const experimentId = experimentResult.insertedId;

        // Update sample logbook
        const sampleResult = await samples.updateOne(
            { _id: new ObjectId(data.sampleId) },
            { 
                $set: { recentTraitChangeDate: new Date().toISOString() }, 
                $push: { 
                    logbook: [
                        `${new Date().toISOString()}`, 
                        `New experiment ${data.name} created for sample ${data.sampleId}`
                    ] 
                } 
            }
        );

        if (sampleResult.modifiedCount === 0) {
            console.warn(`Failed to update sample logbook for sample ${data.sampleId}`);
        }

        // Insert embedded traits if present
        if (embeddedTraits.length > 0) {
            const traits = db.collection("traits");
            
            // Set the experiment ID for each trait
            const traitsToInsert = embeddedTraits.map(trait => ({
                ...trait,
                experimentId: experimentId.toString(),
                sampleId: data.sampleId, // Ensure sampleId is consistent
                responsible: data.responsible, // Ensure responsible is consistent
            }));

            try {
                const traitResult = await traits.insertMany(traitsToInsert);
                
                
                // Update experiment logbook with trait creation info
                await experiments.updateOne(
                    { _id: experimentId },
                    {
                        $push: {
                            logbook: [
                                `${new Date().toISOString()}`,
                                `Automatically created ${traitResult.insertedCount} traits from parsed data`
                            ]
                        }
                    }
                );
                
            } catch (traitError) {
                console.error("Error creating traits:", traitError);
                // Don't fail the experiment creation, just log the error
                await experiments.updateOne(
                    { _id: experimentId },
                    {
                        $push: {
                            logbook: [
                                `${new Date().toISOString()}`,
                                `Warning: Failed to create ${embeddedTraits.length} embedded traits - ${traitError.message}`
                            ]
                        }
                    }
                );
            }
        }

        return new NextResponse(JSON.stringify({ 
            success: true, 
            id: experimentId,
            experimentId: experimentId,
            traitsCreated: embeddedTraits.length
        }), { status: 200 });
    }
    if (data.method === "setfield") {

        const experiment = await experiments.findOne({ _id: new ObjectId(data.id) });

        let field = data.field;
        const updateData = {
            // Add other fields that you want to update
            [field]: data.value,
            recentChangeDate: new Date().toISOString()
        };

        // retrieve previous value
        const oldValue = experiment[field];

        // Construct logbook entry
        const logbookEntry = [`${new Date().toISOString()}`, `Set ${data.field} from ${oldValue} to ${data.value}`];
        // MongoDB update operation to append to the logbook array
        const result = await experiments.updateOne(
            { _id: experiment._id },
            { $set: updateData, $push: { logbook: logbookEntry } }
        );

        if (result.modifiedCount === 0) {
            return new NextResponse(JSON.stringify({ error: "Failed to update experiment" }), { status: 404 });
        } else {
            return new NextResponse(JSON.stringify({ message: "Experiment updated successfully" }), { status: 200 });
        }
    }
    else {
        return new NextResponse(JSON.stringify({ error: "Method not found" }), { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const { id } = await req.json();

        const client = await get_or_create_client();
        if (!client) {
            return new NextResponse(JSON.stringify({ error: "Failed to connect to database" }), { status: 500 });
        }

        const dbname = await get_database_user();
        const db = client.db(dbname);
        const experiments = db.collection("experiments");
        const files = db.collection("files");

        // Find the experiment
        const experiment = await experiments.findOne({ _id: new ObjectId(id) });
        if (!experiment) {
            return new NextResponse(JSON.stringify({ error: "Experiment not found" }), { status: 404 });
        }

        let fileDeleted = false;
        let fileDocDeleted = false;

        let fileDoc = null;
        // Find and delete the file document
        if (experiment.fileId) {
            fileDoc = await files.findOne({ _id: new ObjectId(experiment.fileId) });
            if (fileDoc) {
                try {
                    await fs.unlink(fileDoc.path);
                    await files.deleteOne(fileDoc);
                    fileDeleted = true;
                    fileDocDeleted = true;
                } catch (unlinkError) {
                    console.error(`Error deleting file at path ${fileDoc.path}:`, unlinkError);
                }
            } else {
                console.warn(`File document not found for fileId: ${experiment.fileId}`);
            }
        }

        // Delete the experiment
        const result = await experiments.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            // If experiment deletion fails, try to rollback file deletion
            if (fileDocDeleted) {
                await files.insertOne({ _id: new ObjectId(experiment.fileId), path: fileDoc.path });
            }
            return new NextResponse(JSON.stringify({ error: "Failed to delete experiment" }), { status: 500 });
        }

        return new NextResponse(JSON.stringify({
            message: "Experiment deleted successfully",
            fileDeleted: fileDeleted,
            fileDocDeleted: fileDocDeleted
        }), { status: 200 });

    } catch (error) {
        console.error(error);
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
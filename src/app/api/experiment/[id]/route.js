import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { get_database_user } from "@/app/api/utils/get_database_user";

/**
 * @swagger
 * components:
 *   schemas:
 *     ExperimentWithRawData:
 *       allOf:
 *         - type: object
 *           properties:
 *             _id:
 *               type: string
 *               description: MongoDB ObjectId
 *               example: "507f1f77bcf86cd799439011"
 *             name:
 *               type: string
 *               description: Experiment name
 *               example: "Tensile Strength Test #1"
 *             description:
 *               type: string
 *               description: Experiment description
 *               example: "Testing silk fiber tensile properties"
 *             type:
 *               type: string
 *               description: Type of experiment
 *               example: "mechanical"
 *             date:
 *               type: string
 *               format: date-time
 *               description: Experiment date
 *               example: "2024-03-15T10:30:00Z"
 *             sampleId:
 *               type: string
 *               description: Related sample ID
 *               example: "507f1f77bcf86cd799439012"
 *             parameters:
 *               type: object
 *               description: Experiment parameters
 *               additionalProperties: true
 *             rawdata:
 *               type: object
 *               description: Raw experimental data (only included if requested)
 *               properties:
 *                 data:
 *                   type: array
 *                   description: Processed experimental data
 *                   items:
 *                     type: object
 *                 original:
 *                   type: array
 *                   description: Original unprocessed data (only if requested)
 *                   items:
 *                     type: object
 */

/**
 * @swagger
 * /api/experiment/{id}:
 *   get:
 *     summary: Get experiment by ID
 *     description: |
 *       Retrieves detailed information about a specific experiment by its ID.
 *       Optionally includes raw experimental data and original unprocessed data.
 *     tags:
 *       - Experiments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the experiment
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: includeRawData
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to include processed raw experimental data
 *         example: true
 *       - in: query
 *         name: includeOriginalData
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to include original unprocessed data (requires includeRawData=true)
 *         example: false
 *     responses:
 *       200:
 *         description: Experiment retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExperimentWithRawData'
 *       404:
 *         description: Experiment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Experiment not found"
 *       500:
 *         description: Database connection error or internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to connect to database"
 */

async function getExperiment(client, id, includeRawData = false, includeOriginalData = false) {
    const dbname = await get_database_user();
    const db = client.db(dbname);
    
    // Performance optimization: exclude heavy data fields by default
    // Usage: GET /api/experiment/id (fast, no rawdata)
    //        GET /api/experiment/id?includeRawData=true (includes processed data)
    //        GET /api/experiment/id?includeRawData=true&includeOriginalData=true (includes original unprocessed data)
    const projection = includeRawData ? {} : { data: 0, originalData: 0, metadata: 0 };
    const experiment = await db.collection("experiments").findOne({ _id: new ObjectId(id) }, { projection });
    
    if (!experiment) {
        return null;
    }

    // Add rawdata field for backward compatibility if requested
    if (includeRawData) {
        if (includeOriginalData && experiment.originalData) {
            experiment.rawdata = experiment.originalData;
            experiment.isOriginalData = true;
        } else if (experiment.data) {
            experiment.rawdata = experiment.data;
            experiment.isOriginalData = false;
        }
    }

    return experiment;
}

export async function GET(req) {
    try {
        // Get parameters from the URL
        const { searchParams } = new URL(req.url);
        const includeRawData = searchParams.get('includeRawData') === 'true';
        const includeOriginalData = searchParams.get('includeOriginalData') === 'true';

        // Ensure the database client is connected
        const client = await get_or_create_client();
        if (client == null) {
            return NextResponse.json({ error: "Failed to connect to database" }, { status: 500 });
        }

        // Retrieve the experiment ID from the request URL
        const id = req.nextUrl.pathname.split('/').pop();

        // Get experiment data using the helper function
        const experiment = await getExperiment(client, id, includeRawData, includeOriginalData);

        // If the experiment is not found, return a 404 response
        if (experiment == null) {
            return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
        }

        // Return the experiment data as a JSON response
        return NextResponse.json(experiment);
    } catch (error) {
        console.error("Error fetching experiment:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
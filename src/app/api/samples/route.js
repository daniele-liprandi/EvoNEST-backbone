import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { get_database_user, get_name_authuser } from "@/app/api/utils/get_database_user";

/**
 * @swagger
 * components:
 *   schemas:
 *     Sample:
 *       type: object
 *       required:
 *         - name
 *         - type
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           description: Sample name
 *           example: "Araneus diadematus #42"
 *         type:
 *           type: string
 *           enum: [animal, silk, other]
 *           description: Type of sample
 *           example: "animal"
 *         family:
 *           type: string
 *           description: Taxonomic family
 *           example: "Araneidae"
 *         genus:
 *           type: string
 *           description: Taxonomic genus
 *           example: "Araneus"
 *         species:
 *           type: string
 *           description: Taxonomic species
 *           example: "diadematus"
 *         location:
 *           type: string
 *           description: Collection location
 *           example: "Berlin, Germany"
 *         date:
 *           type: string
 *           format: date
 *           description: Collection date
 *           example: "2024-03-15"
 *         collector:
 *           type: string
 *           description: Person who collected the sample
 *           example: "Dr. Smith"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 *         details:
 *           type: string
 *           description: Additional error details
 */

async function getSamples(client) {
    const dbname = await get_database_user();
    const db = client.db(dbname);
    return await db.collection("samples").find().toArray();
}

/**
 * @swagger
 * /api/samples:
 *   get:
 *     summary: Retrieve all samples
 *     description: Get a list of all samples in the database. Supports query parameters for filtering and pagination.
 *     tags:
 *       - Samples
 *     parameters:
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [get-schema]
 *         description: Special method to get sample schema instead of data
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [animal, silk, other]
 *         description: Filter samples by type
 *       - in: query
 *         name: family
 *         schema:
 *           type: string
 *         description: Filter samples by taxonomic family
 *     responses:
 *       200:
 *         description: Successfully retrieved samples
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Sample'
 *             examples:
 *               sample_list:
 *                 summary: Example sample list
 *                 value:
 *                   - _id: "507f1f77bcf86cd799439011"
 *                     name: "Araneus diadematus #42"
 *                     type: "animal"
 *                     family: "Araneidae"
 *                     genus: "Araneus"
 *                     species: "diadematus"
 *                     location: "Berlin, Germany"
 *                     date: "2024-03-15"
 *                     collector: "Dr. Smith"
 *       500:
 *         description: Database connection error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function GET() {
    // Ensure the database client is connected
    const client = await get_or_create_client();
    if (client == null) {
        // If the client is not connected, return an error response
        return new NextResponse(null, { status: 500 });
    }

    // Access the database and the 'users' collection
    const samples = await getSamples(client);

    // Retrieve all users and return them as a JSON response
    return NextResponse.json(samples);
}

async function getSchemaFromSamples(client) {
    const dbname = await get_database_user();
    const db = client.db(dbname);
    const samples = db.collection("samples");

    // Get one sample to start with
    const sampleDoc = await samples.findOne({});
    if (!sampleDoc) return {};

    // Initialize schema with types from first document
    let schema = Object.entries(sampleDoc).reduce((acc, [key, value]) => {
        acc[key] = typeof value;
        return acc;
    }, {});

    // Aggregate to find all unique fields and their types
    const uniqueFields = await samples.aggregate([
        {
            $project: {
                arrayofkeyvalue: { $objectToArray: "$$ROOT" }
            }
        },
        { $unwind: "$arrayofkeyvalue" },
        {
            $group: {
                _id: "$arrayofkeyvalue.k",
                types: { $addToSet: { $type: "$arrayofkeyvalue.v" } }
            }
        }
    ]).toArray();

    // Merge with initial schema
    uniqueFields.forEach(field => {
        if (!schema[field._id]) {
            schema[field._id] = field.types[0];
        }
    });

    return schema;
}

/**
 * @swagger
 * /api/samples:
 *   post:
 *     summary: Create or update samples
 *     description: Create new samples, update existing ones, or perform bulk operations
 *     tags:
 *       - Samples
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 properties:
 *                   method:
 *                     type: string
 *                     enum: [update, setfield, incrementfield]
 *                     description: Operation type
 *                   id:
 *                     type: string
 *                     description: Sample ID for update operations
 *                   field:
 *                     type: string
 *                     description: Field name to update
 *                   value:
 *                     description: New value for the field
 *               - $ref: '#/components/schemas/Sample'
 *               - type: array
 *                 items:
 *                   $ref: '#/components/schemas/Sample'
 *           examples:
 *             create_sample:
 *               summary: Create new sample
 *               value:
 *                 name: "Nephila clavipes #15"
 *                 type: "animal"
 *                 family: "Araneidae"
 *                 genus: "Nephila"
 *                 species: "clavipes"
 *             update_sample:
 *               summary: Update existing sample
 *               value:
 *                 method: "update"
 *                 id: "507f1f77bcf86cd799439011"
 *                 name: "Updated sample name"
 *             set_field:
 *               summary: Set specific field
 *               value:
 *                 method: "setfield"
 *                 id: "507f1f77bcf86cd799439011"
 *                 field: "location"
 *                 value: "New location"
 *     responses:
 *       200:
 *         description: Operation successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 insertedId:
 *                   type: string
 *                   description: ID of newly created sample
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function POST(req) {
    const data = await req.json();
    const client = await get_or_create_client();
    const authuser = await get_name_authuser() || "unknown user";

    if (client == null) {
        return new NextResponse(JSON.stringify({ error: "Failed to connect to database" }), { status: 500 });
    }

    const dbname = await get_database_user();
    const db = client.db(dbname);
    const samples = db.collection("samples");

    // if data contains the field "id", check if it can be found in the database
    let sample = null;
    if (data.id) {
        sample = await samples.findOne({ _id: data.id });
        if (!sample) {
            try {
                sample = await samples.findOne({ _id: new ObjectId(data.id) });
                if (!sample) {
                    return new NextResponse(JSON.stringify({ error: "Sample not found" }), { status: 404 });
                }
            } catch (error) {
                return new NextResponse(JSON.stringify({ error: "Invalid sample ID" }), { status: 400 });
            }
        }
    }

    if (data.parentId) {
        // if the parent is not a sample id, it should be checked if it is a sampleName, and then retreive the id
        let parent = await samples.findOne({ _id: data.parentId });
        if (!parent) {
            try {
                parent = await samples.findOne({ _id: new ObjectId(data.parentId) });
                if (!parent) {
                    try {
                        parent = await samples.findOne({ name: data.parentId });
                        if (!parent) {
                            return new NextResponse(JSON.stringify({ error: "Parent sample not found" }), { status: 404 });
                        }
                    } catch (error) {
                        return new NextResponse(JSON.stringify({ error: "Parent sample not found" }), { status: 404 });
                    }
                }
            } catch (error) {
                return new NextResponse(JSON.stringify({ error: "Parent sample not found" }), { status: 404 });
            }
        }
        data.parentId = parent._id;
    }


    // Check if the request is to update a sample
    if (data.method === "update") {
        const logbookEntry = [`${new Date().toISOString()}`, `updated sample ${data.id} with values from ${data} by ${authuser}`];
        const updateData = {
            // Add other fields that you want to update
            parentId: data.parentId,
            family: data.family,
            genus: data.genus,
            species: data.species,
            responsible: data.responsible,
            type: data.type,
            date: data.date,
            location: data.location,
            lat: data.lat,
            lon: data.lon,
            sex: data.sex,
            box: data.box,
            slot: data.slot,
            notes: data.notes,
            subsampletype: data.subsampletype,
            recentChangeDate: new Date().toISOString()
        };

        const result = await samples.updateOne(
            { _id: new ObjectId(data.id) },
            { $set: updateData, $push: { logbook: logbookEntry } }
        );

        if (result.modifiedCount === 0) {
            return new NextResponse(JSON.stringify({ error: "Failed to update sample" }), { status: 404 });
        } else {
            return new NextResponse(JSON.stringify({ message: "Sample updated successfully" }), { status: 200 });
        }
    }

    // Check if the request is to update a sample
    if (data.method === "setfield") {

        let field = data.field;
        const updateData = {
            [field]: data.value,
            recentChangeDate: new Date().toISOString()
        };

        // retrieve previous value if it exists, without triggering TypeError if it doesn't
        let oldValue = sample[field] || "undefined";

        // if data contains a custom logbook entry, use it, otherwise create a default one
        let logbookEntry = [`${new Date().toISOString()}`, `Set ${field} from ${oldValue} to ${data.value} by ${authuser}`];
        if (data.customLogbookEntry) {
            logbookEntry = [`${new Date().toISOString()}`, `${data.customLogbookEntry} by ${authuser}`];
        } else {
            logbookEntry = [`${new Date().toISOString()}`, `Set ${data.field} from ${oldValue} to ${data.value} by ${authuser}`];
        }
        // MongoDB update operation to append to the logbook array
        const result = await samples.updateOne(
            { _id: sample._id },
            { $set: updateData, $push: { logbook: logbookEntry } }
        );

        if (result.modifiedCount === 0) {
            return new NextResponse(JSON.stringify({ error: "Failed to update sample" }), { status: 404 });
        } else {
            return new NextResponse(JSON.stringify({ message: "Sample updated successfully" }), { status: 200 });
        }
    }

    // Assuming data.method is "incrementfield" and data contains 'id' and the field name to increment
    if (data.method === "incrementfield") {

        const fieldToIncrement = data.field;
        const logbookEntry = [`${new Date().toISOString()}`, ` ${data.field}`, `${authuser}`];

        // MongoDB update operation to increment the specified field
        const updateQuery = {
            $set: { recentChangeDate: new Date().toISOString() }, // Update the recentChangeDate field
            $inc: { [fieldToIncrement]: 1 }, $push: { logbook: logbookEntry } // Increment the specified field by 1
        };

        if (fieldToIncrement === "fed") {
            updateQuery.$set = { recentChangeDate: new Date().toISOString(), lastFed: new Date().toISOString() };
        }

        const result = await samples.updateOne(
            { _id: sample._id },
            updateQuery
        );

        // Check if the delete operation was successful
        if (result.modifiedCount === 0) {
            return new NextResponse(JSON.stringify({ error: "Sample not found or already deleted" }), { status: 404 });
        } else {
            return new NextResponse(JSON.stringify({ message: "Counter incremented successfully" }), { status: 200 });
        }
    }

    if (data.method === "get-schema") {
        const schema = await getSchemaFromSamples(client);
        return NextResponse.json(schema);
    }


    // Validate responsible user exists

    const users = client.db("usersdb").collection("users");
    let responsibleUser = await users.findOne({ _id: data.responsible });
    if (responsibleUser == null) {
        //check if it has to be an ObjectId
        try {
            responsibleUser = await users.findOne({ _id: new ObjectId(data.responsible) });
        } catch (error) {
            return new NextResponse(JSON.stringify({ error: "Invalid responsible user ID" }), { status: 400 });
        }
    }

    // Create a new sample if it's not an update
    const sampleData = {
        name: data.name,
        parentId: data.parentId,
        family: data.family,
        genus: data.genus,
        species: data.species,
        responsible: data.responsible,
        type: data.type,
        date: data.date,
        location: data.location,
        lat: data.lat,
        lon: data.lon,
        sex: data.sex,
        box: data.box,
        slot: data.slot,
        subsampletype: data.subsampletype,
        notes: data.notes,
        _id: data._id,
        recentChangeDate: new Date().toISOString(),
        logbook: [[`${new Date().toISOString()}`, `Uploaded sample ${data.name} by ${authuser}`]]
    };

    {
        // If the sample doesn't exist, create a new one
        const result = await samples.insertOne(sampleData);

        if (result.insertedCount == 0) {
            return new NextResponse(JSON.stringify({ error: "Failed to create sample" }), { status: 500 });
        } else {
            return new NextResponse(JSON.stringify({ error: "Success" }), { status: 200 });
        }
    }
}

export async function DELETE(req) {
    try {
        // Parse the request body to get the sample ID
        let { id } = await req.json();

        // Ensure the database client is connected
        const client = await get_or_create_client();
        if (!client) {
            return new NextResponse(JSON.stringify({ error: "Failed to connect to database" }), { status: 500 });
        }

        // Access the database and the 'samples' collection
        const dbname = await get_database_user();
        const db = client.db(dbname);
        const samples = db.collection("samples");

        // Perform the delete operation
        const result = await samples.deleteOne({ _id: id });

        // Check if the delete operation was successful
        if (result.deletedCount === 0) {
            const resultObjectId = await samples.deleteOne({ _id: new ObjectId(id) });
            if (resultObjectId.deletedCount === 0) {
                return new NextResponse(JSON.stringify({ error: "Sample not found or already deleted" }), { status: 404 });
            }
        }

        return new NextResponse(JSON.stringify({ message: "Sample deleted successfully" }), { status: 200 });
    } catch (error) {
        console.error(error);
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
// /api/users/route.js

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           description: User's full name
 *           example: "Dr. Jane Smith"
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "jane.smith@university.edu"
 *         institution:
 *           type: string
 *           description: User's affiliated institution
 *           example: "University of Science"
 *         role:
 *           type: string
 *           enum: [admin, researcher, student, viewer]
 *           description: User's role in the system
 *           example: "researcher" 
 *         databases:
 *           type: array
 *           items:
 *             type: string
 *           description: List of databases the user has access to
 *           example: ["spiderdb", "evolutiondb"]
 *         activeDatabase:
 *           type: string
 *           description: Currently selected database for the user
 *           example: "spiderdb"
 *           nullable: true
 *         isActive:
 *           type: boolean
 *           description: Whether the user account is active
 *           example: true
 *         createdDate:
 *           type: string
 *           format: date-time
 *           description: When the user was created
 *           example: "2024-01-15T10:30:00Z"
 *         recentChangeDate:
 *           type: string
 *           format: date-time
 *           description: Last modification date
 *           example: "2024-03-15T14:20:00Z"
 *         logbook:
 *           type: array
 *           items:
 *             type: string
 *           description: Activity log entries
 *           example: ["2024-01-15T10:30:00Z: User created", "2024-03-15T14:20:00Z: Profile updated"]
 *     UserCreateRequest:
 *       type: object
 *       required:
 *         - method
 *         - name
 *         - email
 *       properties:
 *         method:
 *           type: string
 *           enum: [create]
 *           description: Action to perform
 *           example: "create"
 *         name:
 *           type: string
 *           description: User's full name
 *           example: "Dr. Jane Smith"
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "jane.smith@university.edu"
 *         institution:
 *           type: string
 *           description: User's affiliated institution
 *           example: "University of Science"
 *         role:
 *           type: string
 *           enum: [admin, researcher, student, viewer]
 *           description: User's role in the system
 *           example: "researcher"
 *         databases:
 *           type: array
 *           items:
 *             type: string
 *           description: List of databases the user should have access to
 *           example: ["spiderdb"]
 *     UserUpdateRequest:
 *       type: object
 *       required:
 *         - method
 *         - id
 *       properties:
 *         method:
 *           type: string
 *           enum: [update]
 *           description: Action to perform
 *           example: "update"
 *         id:
 *           type: string
 *           description: User ID to update
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           description: User's full name
 *           example: "Dr. Jane Smith"
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "jane.smith@university.edu"
 *         institution:
 *           type: string
 *           description: User's affiliated institution
 *           example: "University of Science"
 *         role:
 *           type: string
 *           enum: [admin, researcher, student, viewer]
 *           description: User's role in the system
 *           example: "researcher"
 *         databases:
 *           type: array
 *           items:
 *             type: string
 *           description: List of databases the user should have access to
 *           example: ["spiderdb", "evolutiondb"]
 *         isActive:
 *           type: boolean
 *           description: Whether the user account is active
 *           example: true
 *     UserFieldUpdateRequest:
 *       type: object
 *       required:
 *         - method
 *         - field
 *         - value
 *       properties:
 *         method:
 *           type: string
 *           enum: [setfield]
 *           description: Action to perform
 *           example: "setfield"
 *         field:
 *           type: string
 *           description: Field name to update
 *           example: "role"
 *         value:
 *           oneOf:
 *             - type: string
 *             - type: boolean
 *             - type: array
 *               items:
 *                 type: string
 *           description: New value for the field
 *           example: "admin"
 *     UserChangeDatabasesRequest:
 *       type: object
 *       required:
 *         - method
 *         - id
 *         - databases
 *       properties:
 *         method:
 *           type: string
 *           enum: [change_databases]
 *           description: Action to perform
 *           example: "change_databases"
 *         id:
 *           type: string
 *           description: User ID to update
 *           example: "507f1f77bcf86cd799439011"
 *         databases:
 *           type: array
 *           items:
 *             type: string
 *           description: List of databases the user should have access to
 *           example: ["spiderdb", "evolutiondb"]
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 *           example: "Failed to connect to database"
 *         details:
 *           type: string
 *           description: Additional error details
 *           example: "Connection timeout after 30 seconds"
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Retrieve all users
 *     description: Get a list of all users in the system. When not in auth mode, filters users by database access based on the current user's permissions.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: query
 *         name: auth
 *         schema:
 *           type: boolean
 *         description: Set to true to bypass database filtering (for authentication flows)
 *         example: false
 *     responses:
 *       200:
 *         description: Successfully retrieved users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Database connection error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Create, update, or modify a user
 *     description: |
 *       Handles multiple user operations based on the method field:
 *       - **create**: Create a new user account
 *       - **update**: Update an existing user's information
 *       - **setfield**: Update a specific field of a user
 *       - **delete**: Remove a user from the system
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/UserCreateRequest'
 *               - $ref: '#/components/schemas/UserUpdateRequest'
 *               - $ref: '#/components/schemas/UserFieldUpdateRequest'
 *               - $ref: '#/components/schemas/UserChangeDatabasesRequest'
 *           examples:
 *             createUser:
 *               summary: Create a new user
 *               value:
 *                 method: "create"
 *                 name: "Dr. Jane Smith"
 *                 email: "jane.smith@university.edu"
 *                 institution: "University of Science"
 *                 role: "researcher"
 *                 databases: ["spiderdb"]
 *             updateUser:
 *               summary: Update an existing user
 *               value:
 *                 method: "update"
 *                 id: "507f1f77bcf86cd799439011"
 *                 name: "Dr. Jane Smith-Johnson"
 *                 role: "admin"
 *             setUserField:
 *               summary: Update a specific field
 *               value:
 *                 method: "setfield"
 *                 field: "isActive"
 *                 value: false
 *             changeDatabases:
 *               summary: Change user's database access
 *               value:
 *                 method: "change_databases"
 *                 id: "507f1f77bcf86cd799439011"
 *                 databases: ["spiderdb", "evolutiondb"]
 *     responses:
 *       200:
 *         description: User operation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User updated successfully"
 *                 id:
 *                   type: string
 *                   description: User ID (for create operations)
 *                   example: "507f1f77bcf86cd799439011"
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found (for update/delete operations)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: User already exists (for create operations)
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

import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { get_database_user, check_user_role } from "../utils/get_database_user";

async function getUsers(client) {
    const db = client.db("usersdb");
    return await db.collection("users").find().toArray();
}

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const isAuth = searchParams.get('auth') === 'true';
   
    // Ensure the database client is connected
    const client = await get_or_create_client();
    if (client == null) {
        return new NextResponse(null, { status: 500 });
    }

    // Get all users
    let users = await getUsers(client);

    // Only filter by database if we're not in the auth flow
    if (!isAuth) {
        try {
            const dbname = await get_database_user();
            if (dbname) {
                users = users.filter(user => {
                    if (!user || !Array.isArray(user.databases)) {
                        return false;
                    }
                    return user.databases.includes(dbname);
                });
            }
        } catch (error) {
            console.error('Error filtering users:', error);
        }
    }

    return NextResponse.json(users);
}

export async function POST(req) {
    const data = await req.json();
    const client = await get_or_create_client();

    if (client == null) {
        return new NextResponse(JSON.stringify({ error: "Failed to connect to database" }), { status: 500 });
    }

    const db = client.db("usersdb");
    const users = db.collection("users");

    // Check if the request is to update a sample
    if (data.method === "update") {
        const logbookEntry = `${new Date().toISOString()}: updated user ${data.id}`;
        const id = data.id;
        delete data.method;
        delete data.id;
        const updateData = {
            ...data,
            recentChangeDate: new Date().toISOString()
        };

        const result = await users.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData, $push: { logbook: logbookEntry } }
        );

        if (result.modifiedCount === 0) {
            return new NextResponse(JSON.stringify({ error: "Failed to update user" }), { status: 404 });
        } else {
            return new NextResponse(JSON.stringify({ message: "User updated successfully" }), { status: 200 });
        }
    }

    // Check if the request is to update a sample
    if (data.method === "setfield") {
        let field = data.field
        const updateData = {
            // Add other fields that you want to update
            [field]: data.value,
            recentChangeDate: new Date().toISOString()
        };

        // Construct logbook entry
        const logbookEntry = `${new Date().toISOString()} Set ${data.field} to ${data.value}`;
        // MongoDB update operation to append to the logbook array
        const result = await users.updateOne(
            { _id: new ObjectId(data.id) },
            { $set: updateData, $push: { logbook: logbookEntry } }
        );

        if (result.modifiedCount === 0) {
            return new NextResponse(JSON.stringify({ error: "Failed to update user" }), { status: 404 });
        } else {
            return new NextResponse(JSON.stringify({ message: "User updated successfully" }), { status: 200 });
        }
    }

    // Assuming data.method is "incrementfield" and data contains 'id' and the field name to increment
    if (data.method === "incrementfield") {
        // Field to increment, e.g., 'timesMolted' or 'timesFed'
        const fieldToIncrement = data.field;
        const logbookEntry = [`${new Date().toISOString()}`,` ${data.field}`];

        // MongoDB update operation to increment the specified field
        const updateQuery = {
            $set: { recentChangeDate: new Date().toISOString() }, // Update the recentChangeDate field
            $inc: { [fieldToIncrement]: 1 }, $push: { logbook: logbookEntry } // Increment the specified field by 1
        };

        const result = await users.updateOne(
            { _id: new ObjectId(data.id) },
            updateQuery
        );        if (result.modifiedCount === 0) {
            return new NextResponse(JSON.stringify({ error: "Failed to increment counter" }), { status: 404 });
        } else {
            return new NextResponse(JSON.stringify({ message: "Counter incremented successfully" }), { status: 200 });
        }
    }

    // Check if the request is to change user databases
    if (data.method === "change_databases") {
        // Check if user has admin role before allowing database changes
        const isAdmin = await check_user_role('admin');
        if (!isAdmin) {
            return new NextResponse(JSON.stringify({ error: "Only administrators can change user databases" }), { status: 403 });
        }

        // Validate that all requested databases exist in the system
        if (data.databases && data.databases.length > 0) {
            const systemDb = client.db("systemdb");
            const settingsCollection = systemDb.collection("settings");
            const databaseSettings = await settingsCollection.findOne({ type: "databases" });
            const availableDatabases = databaseSettings?.databases || ["admin", "evonest"];
            
            const invalidDatabases = data.databases.filter(db => !availableDatabases.includes(db));
            if (invalidDatabases.length > 0) {
                return new NextResponse(JSON.stringify({ 
                    error: `Invalid databases: ${invalidDatabases.join(', ')}. Available databases: ${availableDatabases.join(', ')}` 
                }), { status: 400 });
            }
        }

        const newActiveDatabase = data.databases && data.databases.length > 0 ? data.databases[0] : null;
        const updateData = {
            databases: data.databases || [],
            activeDatabase: newActiveDatabase,
            recentChangeDate: new Date().toISOString()
        };

        // Construct logbook entry
        const logbookEntry = `${new Date().toISOString()}: Databases changed to [${(data.databases || []).join(', ')}] by admin`;
        
        const result = await users.updateOne(
            { _id: new ObjectId(data.id) },
            { $set: updateData, $push: { logbook: logbookEntry } }
        );

        if (result.modifiedCount === 0) {
            return new NextResponse(JSON.stringify({ error: "Failed to update user databases" }), { status: 404 });
        } else {
            return new NextResponse(JSON.stringify({ message: "User databases updated successfully" }), { status: 200 });
        }
    }

    // Create a new user if it's not an update
    // Check if user has admin role before allowing user creation
    const isAdmin = await check_user_role('admin');
    if (!isAdmin) {
        return new NextResponse(JSON.stringify({ error: "Only administrators can create new users" }), { status: 403 });
    }

    // Validate that all requested databases exist in the system
    if (data.databases && data.databases.length > 0) {
        const systemDb = client.db("systemdb");
        const settingsCollection = systemDb.collection("settings");
        const databaseSettings = await settingsCollection.findOne({ type: "databases" });
        const availableDatabases = databaseSettings?.databases || ["admin", "evonest"];
        
        const invalidDatabases = data.databases.filter(db => !availableDatabases.includes(db));
        if (invalidDatabases.length > 0) {
            return new NextResponse(JSON.stringify({ 
                error: `Invalid databases: ${invalidDatabases.join(', ')}. Available databases: ${availableDatabases.join(', ')}` 
            }), { status: 400 });
        }
    }

    const userData = {
        name: data.name,
        role: data.role,
        email: data.email,
        databases: data.databases || [],
        activeDatabase: data.databases && data.databases.length > 0 ? data.databases[0] : null,
        institution: data.institution,
        isActive: true,
        createdDate: new Date().toISOString(),
        recentChangeDate: new Date().toISOString(),
        logbook: [`${new Date().toISOString()}: User created`]
    };

    const result = await users.insertOne(userData);

    if (result.insertedId) {
        return new NextResponse(JSON.stringify({ 
            message: "User created successfully", 
            id: result.insertedId 
        }), { status: 200 });
    } else {
        return new NextResponse(JSON.stringify({ error: "Failed to create user" }), { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        // Check if user has admin role before allowing user deletion
        const isAdmin = await check_user_role('admin');
        if (!isAdmin) {
            return new NextResponse(JSON.stringify({ error: "Only administrators can delete users" }), { status: 403 });
        }

        // Parse the request body to get the sample ID
        const { id } = await req.json();

        // Ensure the database client is connected
        const client = await get_or_create_client();
        if (!client) {
            return new NextResponse(JSON.stringify({ error: "Failed to connect to database" }), { status: 500 });
        }

        // Access the database and the 'samples' collection
        const db = client.db("usersdb");
        const users = db.collection("users");

        // Perform the delete operation
        const result = await users.deleteOne({ _id: new ObjectId(id) });

        // Check if the delete operation was successful
        if (result.deletedCount === 0) {
            return new NextResponse(JSON.stringify({ error: "User not found or already deleted" }), { status: 404 });
        }

        return new NextResponse(JSON.stringify({ message: "User deleted successfully" }), { status: 200 });
    } catch (error) {
        console.error(error);
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

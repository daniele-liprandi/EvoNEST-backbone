/**
 * API endpoint for managing API keys
 * 
 * GET /api/user/api-keys - List all API keys for the authenticated user
 * POST /api/user/api-keys - Generate a new API key
 * DELETE /api/user/api-keys - Revoke an API key
 */

import { NextResponse } from 'next/server';
import { get_or_create_client } from '@/app/api/utils/mongodbClient';
import { get_current_user } from '@/app/api/utils/get_database_user';
import { generateApiKey } from '@/app/api/utils/apiKeyAuth';
import { ObjectId } from 'mongodb';

/**
 * GET - List all API keys for the authenticated user
 */
export async function GET(req) {
    try {
        const user = await get_current_user();
        const client = await get_or_create_client();
        
        if (!client) {
            return new NextResponse(
                JSON.stringify({ error: "Failed to connect to database" }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const users = client.db("usersdb").collection("users");
        const userDoc = await users.findOne({ _id: user._id });

        if (!userDoc) {
            return new NextResponse(
                JSON.stringify({ error: "User not found" }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Return API keys without exposing the full key (only show last 8 characters)
        const apiKeys = (userDoc.apiKeys || []).map(key => ({
            id: key._id || key.key.substring(key.key.length - 8),
            name: key.name,
            keyPreview: `...${key.key.substring(key.key.length - 8)}`,
            isActive: key.isActive,
            createdAt: key.createdAt,
            expiresAt: key.expiresAt,
            lastUsedAt: key.lastUsedAt,
            usageCount: key.usageCount || 0,
            databases: userDoc.databases // API keys have access to all user's databases
        }));

        return NextResponse.json({
            apiKeys: apiKeys,
            totalKeys: apiKeys.length,
            activeKeys: apiKeys.filter(k => k.isActive).length
        });

    } catch (error) {
        console.error("Error fetching API keys:", error);
        return new NextResponse(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

/**
 * POST - Generate a new API key
 * Body: { name: string, expiresInDays?: number }
 */
export async function POST(req) {
    try {
        const user = await get_current_user();
        const data = await req.json();
        const client = await get_or_create_client();

        if (!client) {
            return new NextResponse(
                JSON.stringify({ error: "Failed to connect to database" }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const users = client.db("usersdb").collection("users");

        // Generate new API key
        const apiKey = generateApiKey();
        const now = new Date();
        
        // Calculate expiration date if provided (default: no expiration)
        let expiresAt = null;
        if (data.expiresInDays && data.expiresInDays > 0) {
            expiresAt = new Date(now);
            expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);
        }

        const keyRecord = {
            _id: new ObjectId(),
            key: apiKey,
            name: data.name || `API Key ${now.toISOString()}`,
            isActive: true,
            createdAt: now.toISOString(),
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
            lastUsedAt: null,
            usageCount: 0
        };

        // Add API key to user's document
        const result = await users.updateOne(
            { _id: user._id },
            {
                $push: { 
                    apiKeys: keyRecord,
                    logbook: `${now.toISOString()}: Created new API key "${keyRecord.name}"` 
                }
            }
        );

        if (result.modifiedCount === 0) {
            return new NextResponse(
                JSON.stringify({ error: "Failed to create API key" }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Return the full API key ONLY on creation (this is the only time the user will see it)
        return NextResponse.json({
            message: "API key created successfully",
            apiKey: apiKey,
            keyId: keyRecord._id.toString(),
            name: keyRecord.name,
            createdAt: keyRecord.createdAt,
            expiresAt: keyRecord.expiresAt,
            warning: "This is the only time you will see the full API key. Please save it securely."
        });

    } catch (error) {
        console.error("Error creating API key:", error);
        return new NextResponse(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

/**
 * DELETE - Revoke an API key
 * Body: { keyId: string } or { key: string }
 */
export async function DELETE(req) {
    try {
        const user = await get_current_user();
        const data = await req.json();
        const client = await get_or_create_client();

        if (!client) {
            return new NextResponse(
                JSON.stringify({ error: "Failed to connect to database" }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!data.keyId && !data.key) {
            return new NextResponse(
                JSON.stringify({ error: "Either keyId or key must be provided" }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const users = client.db("usersdb").collection("users");
        const now = new Date();

        // Build the query to find and deactivate the API key
        const logMessage = data.keyId 
            ? `${now.toISOString()}: Revoked API key with ID ${data.keyId}`
            : `${now.toISOString()}: Revoked API key`;
        
        const updateQuery = {
            $set: { "apiKeys.$[key].isActive": false },
            $push: { logbook: logMessage }
        };

        const arrayFilters = data.keyId 
            ? [{ "key._id": new ObjectId(data.keyId) }]
            : [{ "key.key": data.key }];

        const result = await users.updateOne(
            { _id: user._id },
            updateQuery,
            { arrayFilters: arrayFilters }
        );

        if (result.modifiedCount === 0) {
            return new NextResponse(
                JSON.stringify({ error: "API key not found or already revoked" }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return NextResponse.json({
            message: "API key revoked successfully"
        });

    } catch (error) {
        console.error("Error revoking API key:", error);
        return new NextResponse(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

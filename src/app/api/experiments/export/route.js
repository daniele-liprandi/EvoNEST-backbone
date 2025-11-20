/**
 * API endpoint for exporting tensile test experimental data
 * GET /api/experiments/export
 * 
 * Query parameters:
 * - format: 'json' (default: 'json')
 * - type: experiment type filter (default: 'tensile_test')
 */

import { NextResponse } from 'next/server';
import { get_or_create_client } from '@/app/api/utils/mongodbClient';
import { get_database_user } from '@/app/api/utils/get_database_user';
import {
    exportExperimentsToStructuredFormat
} from '@/utils/exporters/json-exporter';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const format = searchParams.get('format') || 'json';
        const type = searchParams.get('type') || 'tensile_test';

        // Connect to database
        const client = await get_or_create_client();
        if (!client) {
            return new NextResponse(
                JSON.stringify({ error: "Failed to connect to database" }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const dbname = await get_database_user();
        const db = client.db(dbname);

        // Fetch all experiments with raw data
        const experiments = await db.collection("experiments")
            .find({ type: type })
            .toArray();

        if (experiments.length === 0) {
            return new NextResponse(
                JSON.stringify({ error: "No experiments found" }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Only JSON export is supported
        if (format && format.toLowerCase() !== 'json') {
            return new NextResponse(
                JSON.stringify({ error: 'Only JSON export is supported. Please request format=json or omit the format parameter.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const structuredData = exportExperimentsToStructuredFormat(experiments);
        return new NextResponse(JSON.stringify(structuredData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="tensile_tests_${new Date().toISOString().split('T')[0]}.json"`
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

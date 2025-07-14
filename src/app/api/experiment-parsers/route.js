/**
 * API endpoint to get available experiment parsers
 */

import { NextResponse } from "next/server";
import { getRegisteredTypes, getParser } from "@/utils/experiment-parsers/registry";

/**
 * @swagger
 * /api/experiment-parsers:
 *   get:
 *     summary: Get available experiment parsers
 *     description: Returns a list of experiment types that have parsers available for automatic trait generation
 *     tags:
 *       - Experiment Parsers
 *     responses:
 *       200:
 *         description: List of available parsers
 */

export async function GET() {
    try {
        const registeredTypes = getRegisteredTypes();
        
        const parsers = registeredTypes.map(type => {
            const ParserClass = getParser(type);
            if (!ParserClass) return null;
            
            // Get parser metadata from the parser class itself
            const parser = new ParserClass();
            
            return {
                type,
                label: parser.label || parser.name || type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                description: parser.description || `Processes ${type.replace('_', ' ')} data`,
                supportedTypes: parser.supportedTypes || [type],
                requiredFields: parser.requiredFields || [],
                generatedTraits: parser.generatedTraits || [],
                version: parser.version || '1.0.0',
                hasSupport: true
            };
        }).filter(Boolean);

        return NextResponse.json({
            success: true,
            parsers
        });

    } catch (error) {
        console.error('Error fetching experiment parsers:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch experiment parsers',
                parsers: []
            },
            { status: 500 }
        );
    }
}

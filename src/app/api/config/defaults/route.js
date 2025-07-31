import { DEFAULT_CONFIGS } from "@/shared/config/default-types";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/config/defaults:
 *   get:
 *     summary: Get default configuration values
 *     description: Retrieve the default configuration values that are used for seeding
 *     tags:
 *       - Configuration
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [sampletypes, traittypes, equipmenttypes, samplesubtypes, silkcategories, siprefixes]
 *         description: Specific configuration type to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved default configuration
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: All default configurations
 *                 - type: array
 *                   description: Specific configuration type data
 *       400:
 *         description: Invalid configuration type
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    
    if (type) {
      if (!(type in DEFAULT_CONFIGS)) {
        return new NextResponse(
          JSON.stringify({ error: `Invalid configuration type: ${type}` }), 
          { status: 400 }
        );
      }
      return NextResponse.json(DEFAULT_CONFIGS[type]);
    }
    
    return NextResponse.json(DEFAULT_CONFIGS);
  } catch (error) {
    console.error('Config defaults GET error:', error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to retrieve default configuration" }), 
      { status: 500 }
    );
  }
}

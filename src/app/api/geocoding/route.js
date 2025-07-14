import { NextResponse } from "next/server";

/**
 * @swagger
 * components:
 *   schemas:
 *     GeocodingRequest:
 *       type: object
 *       required:
 *         - location
 *       properties:
 *         location:
 *           type: string
 *           description: Location name or address to geocode
 *           example: "Berlin, Germany"
 *     GeocodingResponse:
 *       type: object
 *       properties:
 *         coordinates:
 *           type: object
 *           properties:
 *             lat:
 *               type: string
 *               description: Latitude coordinate
 *               example: "52.5200066"
 *             lon:
 *               type: string
 *               description: Longitude coordinate
 *               example: "13.4049540"
 *             display_name:
 *               type: string
 *               description: Full formatted address
 *               example: "Berlin, Deutschland"
 *             importance:
 *               type: number
 *               description: Importance score of the location
 *               example: 0.75
 */

/**
 * @swagger
 * /api/geocoding:
 *   post:
 *     summary: Geocode location names to coordinates
 *     description: Convert location names or addresses to latitude/longitude coordinates using OpenStreetMap Nominatim service.
 *     tags:
 *       - Utilities
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GeocodingRequest'
 *           examples:
 *             city:
 *               summary: Geocode a city
 *               value:
 *                 location: "Berlin, Germany"
 *             address:
 *               summary: Geocode a specific address
 *               value:
 *                 location: "Brandenburg Gate, Berlin"
 *     responses:
 *       200:
 *         description: Successfully geocoded location
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GeocodingResponse'
 *       404:
 *         description: Location not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */

export async function POST(req) {
  const body = await req.json();
  const { location } = body;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      location
    )}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.length > 0) {
      // Return the first result's coordinates
      return NextResponse.json({ coordinates: data[0] });
    } else {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" + error },
      { status: 500 }
    );
  }
}

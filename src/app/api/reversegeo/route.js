import { NextResponse } from "next/server";

/**
 * @swagger
 * components:
 *   schemas:
 *     ReverseGeoRequest:
 *       type: object
 *       required:
 *         - lat
 *         - lon
 *       properties:
 *         lat:
 *           type: number
 *           format: float
 *           minimum: -90
 *           maximum: 90
 *           description: Latitude coordinate
 *           example: 52.5200
 *         lon:
 *           type: number
 *           format: float
 *           minimum: -180
 *           maximum: 180
 *           description: Longitude coordinate
 *           example: 13.4050
 *     ReverseGeoResponse:
 *       type: object
 *       properties:
 *         location:
 *           type: object
 *           description: Address information from OpenStreetMap
 *           properties:
 *             house_number:
 *               type: string
 *               example: "1"
 *             road:
 *               type: string
 *               example: "Unter den Linden"
 *             city:
 *               type: string
 *               example: "Berlin"
 *             state:
 *               type: string
 *               example: "Berlin"
 *             country:
 *               type: string
 *               example: "Deutschland"
 *             postcode:
 *               type: string
 *               example: "10117"
 */

/**
 * @swagger
 * /api/reversegeo:
 *   post:
 *     summary: Reverse geocode coordinates to address
 *     description: Converts latitude and longitude coordinates to a human-readable address using OpenStreetMap's Nominatim service
 *     tags:
 *       - Utilities
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReverseGeoRequest'
 *     responses:
 *       200:
 *         description: Address found successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReverseGeoResponse'
 *       400:
 *         description: Invalid JSON in request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bad request, JSON parsing error"
 *       404:
 *         description: No address found for the given coordinates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Not found"
 *       500:
 *         description: Error fetching location data from OpenStreetMap
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 *   get:
 *     summary: Method not allowed
 *     description: GET method is not supported for this endpoint
 *     tags:
 *       - Utilities
 *     responses:
 *       405:
 *         description: Method not allowed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Method not allowed"
 */
export async function POST(req) {
    let body;
    try {
        body = await req.json();
    } catch (error) {
        console.error("Error parsing JSON:", error);
        return NextResponse.json({ message: "Bad request, JSON parsing error" }, { status: 400 });
    }

    console.log(body);

    const { lat, lon } = body;
    console.log(lat, lon);

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
        const response = await fetch(url);
        const data = await response.json();
        console.log(data);

        if (data && data.address) {
            return NextResponse.json({ location: data.address });
        } else {
            return NextResponse.json({ message: "Not found" }, { status: 404 });
        }
    } catch (error) {
        console.error("Error fetching location:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
}

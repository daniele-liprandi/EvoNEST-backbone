import { NextResponse } from "next/server";

const REQUEST_TIMEOUT_MS = 8000;
const NOMINATIM_MIN_INTERVAL_MS = 1000;
let lastNominatimRequestAt = 0;

async function enforceNominatimRateLimit() {
  const now = Date.now();
  const elapsed = now - lastNominatimRequestAt;
  if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, NOMINATIM_MIN_INTERVAL_MS - elapsed)
    );
  }
  lastNominatimRequestAt = Date.now();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

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
    await enforceNominatimRateLimit();
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      location
    )}`;
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "EvoNEST-backbone/1.0 (research platform)",
      },
    });
    const data = await response.json();

    if (data && data.length > 0) {
      // Return the first result's coordinates
      return NextResponse.json({
        coordinates: data[0],
        attribution: "Geocoding by Nominatim (OpenStreetMap)",
      });
    } else {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Geocoding request failed:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

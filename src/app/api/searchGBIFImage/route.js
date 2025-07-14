import { NextResponse } from 'next/server';

/**
 * @swagger
 * components:
 *   schemas:
 *     GBIFImageResponse:
 *       type: object
 *       properties:
 *         imageUrl:
 *           type: string
 *           format: uri
 *           description: URL of the first available image
 *           example: "https://inaturalist-open-data.s3.amazonaws.com/photos/12345/original.jpg"
 *         rightsHolder:
 *           type: string
 *           description: Rights holder or photographer
 *           example: "John Doe"
 *         country:
 *           type: string
 *           description: Country where the specimen was observed
 *           example: "Germany"
 */

/**
 * @swagger
 * /api/searchGBIFImage:
 *   get:
 *     summary: Search for species images in GBIF
 *     description: Search the Global Biodiversity Information Facility (GBIF) database for images of species based on a query string.
 *     tags:
 *       - Utilities
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Species name or search query
 *         example: "Araneus diadematus"
 *     responses:
 *       200:
 *         description: Successfully found image
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GBIFImageResponse'
 *       404:
 *         description: No images found for the query
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No image results found"
 *       500:
 *         description: Error accessing GBIF API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch from GBIF API"
 */

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');

  const url = `https://api.gbif.org/v1/occurrence/search?mediaType=StillImage&q=${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const firstResultWithImage = data.results.find(result => result.media.length > 0 && result.media[0].type === 'StillImage');
      if (firstResultWithImage) {
        const imageUrl = firstResultWithImage.media[0].identifier;
        const rightsHolder = firstResultWithImage.rightsHolder || 'Unknown';
        const country = firstResultWithImage.country || 'Unknown';
        return NextResponse.json({ imageUrl, rightsHolder, country });
      } else {
        return NextResponse.json({ error: "No image results found" }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: "No image results found" }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/modifyImage:
 *   get:
 *     summary: Add text labels beside a QR code image
 *     description: Downloads a QR image from an allowed host and appends up to three labels on the right.
 *     tags: [Utilities]
 *     parameters:
 *       - { in: query, name: qrcodeurl, required: true, schema: { type: string, format: uri } }
 *       - { in: query, name: labelwidth, schema: { type: integer, default: 400, minimum: 100, maximum: 1000 } }
 *       - { in: query, name: label1, schema: { type: string } }
 *       - { in: query, name: label2, schema: { type: string } }
 *       - { in: query, name: label3, schema: { type: string } }
 *     responses:
 *       200: { description: The labelled PNG }
 *       400: { description: qrcodeurl is missing or not an allowed https host }
 *       401: { description: Unauthorized }
 *       500: { description: Failed to download or process the image }
 */

import { runRoute } from "@/lib/effect";
import { labelQrImage } from "./handlers";

export const GET = (request: Request) => runRoute(labelQrImage(request));

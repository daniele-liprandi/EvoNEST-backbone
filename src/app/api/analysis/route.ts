/**
 * @swagger
 * /api/analysis:
 *   get:
 *     summary: Dimensions, their values, and quantities for a summary
 *     tags: [Analysis]
 *     parameters:
 *       - { in: query, name: source, schema: { type: string, enum: [samples, traits], default: traits } }
 *     responses:
 *       200: { description: "{ source, dimensions: [{ id, label, values }], quantities: [{ value, label, unit, count }] }" }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Summarise samples (counts) or one quantity (statistics) by up to two row dimensions and one column
 *     tags: [Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source: { type: string, enum: [samples, traits], default: traits }
 *               rows: { type: array, items: { type: string } }
 *               column: { type: string, nullable: true }
 *               quantity: { type: string, description: Required for source traits }
 *               filters: { type: object, additionalProperties: { type: array, items: { type: string } } }
 *               unitConversion: { type: boolean, default: true }
 *     responses:
 *       200: { description: "{ rows: [{ key, cells, total }], columns, columnTotals, total, unit, metadata }" }
 *       400: { description: Missing quantity or unknown dimension }
 *       401: { description: Unauthorized }
 */

import { runRoute } from "@/lib/effect";
import { analysisOptions, runAnalysis } from "./handlers";

export const GET = (request: Request) => runRoute(analysisOptions(request));
export const POST = (request: Request) => runRoute(runAnalysis(request));

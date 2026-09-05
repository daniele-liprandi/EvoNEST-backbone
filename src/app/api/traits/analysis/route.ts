/**
 * @swagger
 * /api/traits/analysis:
 *   get:
 *     summary: Available filter options for trait analysis
 *     tags: [Traits]
 *     responses:
 *       200: { description: "{ traitTypes, sampleSubTypes, nfibres, groupByOptions }" }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Statistical analysis of trait measurements
 *     description: >
 *       Mean, stddev, min, max, median and count of a trait type, grouped by a
 *       sample feature. Values are converted from each trait's stored unit to
 *       the type's configured unit (by SI prefix) unless unitConversion is false.
 *     tags: [Traits]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: string }
 *               groupBy:
 *                 type: string
 *                 default: all
 *                 description: >
 *                   all | family | genus | species | fullSpecies | subsampletype |
 *                   fullSpeciesSubsampletype, or any configured sample field key.
 *               filters: { type: object }
 *               unitConversion: { type: boolean, default: true }
 *     responses:
 *       200: { description: "{ results, unit, metadata }" }
 *       400: { description: quantity is required }
 *       401: { description: Unauthorized }
 */

import { runRoute } from "@/lib/effect";
import { analyseTraits, analysisFilterOptions } from "./handlers";

export const GET = () => runRoute(analysisFilterOptions);
export const POST = (request: Request) => runRoute(analyseTraits(request));

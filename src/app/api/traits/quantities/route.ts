/**
 * @swagger
 * /api/traits/quantities:
 *   get:
 *     summary: Trait types present in stored traits, with counts
 *     tags: [Traits]
 *     responses:
 *       200: { description: "[{ quantity, count }]" }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Move stored traits from one trait type to another
 *     tags: [Traits]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [from, to]
 *             properties:
 *               from: { type: string }
 *               to: { type: string }
 *     responses:
 *       200: { description: "{ renamed }" }
 *       400: { description: Missing or identical trait types }
 *       401: { description: Unauthorized }
 *       403: { description: Missing the config.edit capability }
 */

import { runRoute } from "@/lib/effect";
import { listStoredQuantities, renameStoredQuantity } from "./handlers";

export const GET = () => runRoute(listStoredQuantities);
export const POST = (request: Request) => runRoute(renameStoredQuantity(request));

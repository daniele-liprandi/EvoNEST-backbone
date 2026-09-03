/**
 * @swagger
 * /api/checknames:
 *   get:
 *     summary: Health check for the name checking service
 *     tags: [Utilities]
 *     responses:
 *       200: { description: OK }
 *   post:
 *     summary: Verify a scientific name against the Global Names verifier
 *     description: |
 *       Verifies a name via GNames (Catalogue of Life, Encyclopedia of Life, GBIF).
 *       An unrecognised name is never rejected: the response has
 *       `status: "unrecognised"` and a `suggestions` list.
 *     tags: [Utilities]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taxa]
 *             properties:
 *               taxa: { type: string, example: "Araneus diadematus" }
 *               method: { type: string, enum: [correctName, fullTaxaInfo], default: correctName }
 *     responses:
 *       200: { description: Verified, or unrecognised with suggestions }
 *       400: { description: Missing or invalid body }
 *       401: { description: Unauthorized }
 *       502: { description: GNames unreachable }
 */

import { runRoute } from "@/lib/effect";
import { checkNamesHealth, checkName } from "./handlers";

export const GET = () => runRoute(checkNamesHealth);
export const POST = (request: Request) => runRoute(checkName(request));

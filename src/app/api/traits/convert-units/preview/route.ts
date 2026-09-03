/**
 * @swagger
 * /api/traits/convert-units/preview:
 *   post:
 *     summary: Preview unit conversions without writing (first 10)
 *     tags: [Traits]
 *     responses:
 *       200: { description: "{ totalTraits, willConvert, willSkip, preview }" }
 *       400: { description: Invalid body or trait id }
 *       401: { description: Unauthorized }
 */

import { runRoute } from "@/lib/effect";
import { previewConversion } from "./handlers";

export const POST = (request: Request) => runRoute(previewConversion(request));

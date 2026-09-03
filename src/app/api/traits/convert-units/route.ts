/**
 * @swagger
 * /api/traits/convert-units:
 *   post:
 *     summary: Convert trait measurements to their configured default units
 *     description: >
 *       Converts every trait, or the traits named in `traitIds`, whose unit
 *       differs from its type's default by an SI prefix. Others are left alone.
 *     tags: [Traits]
 *     responses:
 *       200: { description: "{ totalTraits, converted, skipped, details }" }
 *       401: { description: Unauthorized }
 *       500: { description: Trait type configuration missing }
 */

import { runRoute } from "@/lib/effect";
import { convertUnits } from "./handlers";

export const POST = (request: Request) => runRoute(convertUnits(request));

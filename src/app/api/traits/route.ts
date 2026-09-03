/**
 * @swagger
 * /api/traits:
 *   get:
 *     summary: Retrieve traits
 *     tags: [Traits]
 *     parameters:
 *       - { in: query, name: id, schema: { type: string }, description: Fetch one trait }
 *       - { in: query, name: type, schema: { type: string } }
 *       - { in: query, name: includeSampleFeatures, schema: { type: boolean } }
 *       - { in: query, name: related, schema: { type: boolean } }
 *     responses:
 *       200: { description: Traits }
 *       401: { description: Unauthorized }
 *       404: { description: Trait not found }
 *   post:
 *     summary: Create or modify traits
 *     description: >
 *       `method: create` inserts a trait and stamps the sample.
 *       `update | setfield | incrementfield` modify one.
 *       `conversion | reset` apply or undo a diameter conversion across the
 *       sample's traits, experiments and raw data.
 *     tags: [Traits]
 *     responses:
 *       200: { description: OK }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Protected field }
 *       404: { description: Not found }
 *   delete:
 *     summary: Delete a trait
 *     tags: [Traits]
 *     responses:
 *       200: { description: Deleted }
 *       400: { description: Invalid id }
 *       403: { description: Missing the traits.delete capability }
 *       404: { description: Not found }
 */

import { runRoute } from "@/lib/effect";
import { listTraits, handleTraitPost, deleteTrait } from "./handlers";

export const GET = (request: Request) => runRoute(listTraits(request));
export const POST = (request: Request) => runRoute(handleTraitPost(request));
export const DELETE = (request: Request) => runRoute(deleteTrait(request));

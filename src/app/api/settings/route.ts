/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: The lab's main settings (id generation and lab info)
 *     tags: [Settings]
 *     responses:
 *       200: { description: "{ success, data }" }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Replace the lab's main settings
 *     tags: [Settings]
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Invalid body }
 *       401: { description: Unauthorized }
 */

import { runRoute } from "@/lib/effect";
import { getSettings, updateSettings } from "./handlers";

export const GET = () => runRoute(getSettings);
export const POST = (request: Request) => runRoute(updateSettings(request));

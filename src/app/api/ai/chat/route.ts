/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Proxy a chat turn to the Mastra service
 *     tags: [Utilities]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message, threadId]
 *             properties:
 *               message: { type: string }
 *               threadId: { type: string }
 *     responses:
 *       200: { description: The assistant's reply (or a graceful unreachable message) }
 *       400: { description: message and threadId are required }
 *       401: { description: Unauthorized }
 *       502: { description: The Mastra service returned an error }
 *       503: { description: The AI service is not configured }
 */

import { runRoute } from "@/lib/effect";
import { proxyChat } from "./handlers";

export const POST = (request: Request) => runRoute(proxyChat(request));

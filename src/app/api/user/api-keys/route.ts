/**
 * @swagger
 * /api/user/api-keys:
 *   get:
 *     summary: List the current user's API keys (previews only)
 *     tags: [Users]
 *     responses:
 *       200: { description: "{ apiKeys, totalKeys, activeKeys }" }
 *       401: { description: Unauthorized }
 *   post:
 *     summary: Generate a new API key (returned in full once)
 *     tags: [Users]
 *     responses:
 *       200: { description: "{ apiKey, keyId, ... }" }
 *       401: { description: Unauthorized }
 *   delete:
 *     summary: Revoke an API key by keyId or key
 *     tags: [Users]
 *     responses:
 *       200: { description: Revoked }
 *       400: { description: keyId or key required }
 *       401: { description: Unauthorized }
 *       404: { description: Not found or already revoked }
 */

import { runRoute } from "@/lib/effect";
import { listApiKeys, createApiKey, revokeApiKey } from "./handlers";

export const GET = () => runRoute(listApiKeys);
export const POST = (request: Request) => runRoute(createApiKey(request));
export const DELETE = (request: Request) => runRoute(revokeApiKey(request));

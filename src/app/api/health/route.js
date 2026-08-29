import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Liveness check
 *     description: Returns 200 while the server process is up. Used by the container HEALTHCHECK. No authentication.
 *     tags:
 *       - Utilities
 *     responses:
 *       200:
 *         description: The server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

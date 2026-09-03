/**
 * @swagger
 * /api/docs/dynamic:
 *   get:
 *     summary: The generated OpenAPI specification
 *     description: swagger-jsdoc scans the API route files and builds the OpenAPI 3.0 spec from their JSDoc.
 *     tags: [Documentation]
 *     responses:
 *       200: { description: The OpenAPI 3.0 specification }
 */

import { runRoute } from "@/lib/effect";
import { getOpenApiSpec } from "./handlers";

export const GET = () => runRoute(getOpenApiSpec);

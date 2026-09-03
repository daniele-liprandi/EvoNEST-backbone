/**
 * @swagger
 * /api/auth/usercontrol:
 *   get:
 *     summary: The session user and their database record, if they have one
 *     description: >
 *       `needsIdentification` is true when the signed-in account is not yet
 *       linked to a user document, so the UI can prompt for the link.
 *     tags: [Users]
 *     responses:
 *       200: { description: "{ user, dbuser?, needsIdentification }" }
 *       401: { description: Unauthorized }
 */

import { runRoute } from "@/lib/effect";
import { getUserControl } from "./handlers";

export const GET = () => runRoute(getUserControl);

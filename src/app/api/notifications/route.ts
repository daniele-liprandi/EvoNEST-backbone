/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: The developer-news feed shown from the bell icon
 *     description: >
 *       Served from a 2.5-minute in-memory cache plus a Next fetch cache and a
 *       Cache-Control header. On a fetch failure it falls back to the stale
 *       cache, then to public/notifications.json, returning 206 with a warning.
 *       Items accept the current schema (id, date, title, body, level) or the
 *       legacy one (name, description, time); an item naming minVersion /
 *       maxVersion is hidden outside that app-version range.
 *     tags: [Utilities]
 *     responses:
 *       200: { description: Notifications }
 *       206: { description: Notifications from a fallback source }
 *       500: { description: Every source failed }
 */

import { runRoute } from "@/lib/effect";
import { getNotifications } from "./handlers";

export const GET = () => runRoute(getNotifications);

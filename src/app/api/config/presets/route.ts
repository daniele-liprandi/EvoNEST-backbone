/**
 * @swagger
 * /api/config/presets:
 *   get:
 *     summary: The lab setup presets
 *     description: Value, label and description of each first-setup preset. Consumed by the setup wizard.
 *     tags: [Configuration]
 *     responses:
 *       200: { description: Preset list }
 */

import { runRoute, ok } from "@/lib/effect";
import { LAB_PRESETS } from "@/shared/config/lab-presets";

export const GET = () =>
  runRoute(ok(LAB_PRESETS.map(({ value, label, description }) => ({ value, label, description }))));

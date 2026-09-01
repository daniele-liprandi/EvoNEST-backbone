import { NextResponse } from "next/server";
import { LAB_PRESETS } from "@/shared/config/lab-presets";

/**
 * @swagger
 * /api/config/presets:
 *   get:
 *     summary: The lab setup presets
 *     description: Value, label and description of each first-setup preset. Consumed by the setup wizard.
 *     tags:
 *       - Configuration
 *     responses:
 *       200:
 *         description: Preset list
 */
export function GET() {
  return NextResponse.json(
    LAB_PRESETS.map(({ value, label, description }) => ({ value, label, description })),
  );
}

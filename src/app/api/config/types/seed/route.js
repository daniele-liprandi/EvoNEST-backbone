import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { NextResponse } from "next/server";
import {
  get_database_user,
  get_name_authuser,
} from "@/app/api/utils/get_database_user";
import { userCan } from "@/app/api/utils/permissions";
import { DEFAULT_CONFIGS } from "@/shared/config/default-types";
import { resolvePreset } from "@/shared/config/lab-presets";

/**
 * @swagger
 * /api/config/types/seed:
 *   post:
 *     summary: Seed the lab configuration
 *     description: Replace every config document with a preset (or the shipped defaults).
 *     tags:
 *       - Configuration
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preset:
 *                 type: string
 *                 description: A lab preset value; omitted or "generic" uses the defaults.
 *               configs:
 *                 type: object
 *                 description: An explicit config set (used by the AI-tailored setup).
 *     responses:
 *       200:
 *         description: Configuration seeded
 *       400:
 *         description: Unknown preset
 *       403:
 *         description: Not allowed to reset the lab configuration
 *       500:
 *         description: Server error
 */
export async function POST(req) {
  try {
    // Destructive: replaces every config document.
    if (!(await userCan("config.seed"))) {
      return new NextResponse(
        JSON.stringify({ error: "Not allowed to reset the lab configuration" }),
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    let configSet = DEFAULT_CONFIGS;
    if (body?.configs && typeof body.configs === "object") {
      configSet = { ...DEFAULT_CONFIGS, ...body.configs };
    } else if (body?.preset && body.preset !== "generic") {
      const resolved = resolvePreset(body.preset);
      if (!resolved) {
        return new NextResponse(JSON.stringify({ error: `Unknown preset "${body.preset}"` }), { status: 400 });
      }
      configSet = resolved;
    }

    const client = await get_or_create_client();
    const authuser = (await get_name_authuser()) || "system";

    if (client == null) {
      return new NextResponse(
        JSON.stringify({ error: "Failed to connect to database" }),
        { status: 500 }
      );
    }

    const dbname = await get_database_user();
    const db = client.db(dbname);
    const configs = db.collection("config");

    // The wizard passes the lab name and a free-text description; keep them on
    // the main settings without touching the rest of that document.
    if (body?.labName || body?.labDescription) {
      const labInfo = {};
      if (body.labName) labInfo["labInfo.name"] = String(body.labName);
      if (body.labDescription) labInfo["labInfo.description"] = String(body.labDescription);
      await db.collection("settings").updateOne(
        { type: "main" },
        { $set: { type: "main", ...labInfo } },
        { upsert: true },
      );
    }

    const results = [];

    for (const [configType, data] of Object.entries(configSet)) {
      const configData = {
        type: configType,
        data: data,
        version: 1,
        lastModified: new Date().toISOString(),
        modifiedBy: authuser,
        isDefault: true,
      };

      // Use upsert to replace existing or create new
      const result = await configs.replaceOne(
        { type: configType },
        configData,
        { upsert: true }
      );

      results.push({
        type: configType,
        action: result.upsertedCount > 0 ? "created" : "updated",
      });
    }

    return NextResponse.json({
      message: "Database set to defaults completed",
      results: results,
    });
  } catch (error) {
    console.error("Config set error:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

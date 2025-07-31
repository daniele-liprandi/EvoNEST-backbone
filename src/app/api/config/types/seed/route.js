import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { NextResponse } from "next/server";
import {
  get_database_user,
  get_name_authuser,
} from "@/app/api/utils/get_database_user";
import { DEFAULT_CONFIGS } from "@/shared/config/default-types";

/**
 * @swagger
 * /api/config/types/seed:
 *   post:
 *     summary: Seed database with default configurations
 *     description: Replace existing configurations with defaults or create them if they don't exist
 *     tags:
 *       - Configuration
 *     responses:
 *       200:
 *         description: Database set to defaults successfully
 *       500:
 *         description: Server error
 */
export async function POST(req) {
  try {
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

    const results = [];

    for (const [configType, data] of Object.entries(DEFAULT_CONFIGS)) {
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

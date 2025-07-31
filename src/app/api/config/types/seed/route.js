import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { NextResponse } from "next/server";
import { get_database_user, get_name_authuser } from "@/app/api/utils/get_database_user";
import { DEFAULT_CONFIGS } from "@/shared/config/default-types";

/**
 * @swagger
 * /api/config/types/seed:
 *   post:
 *     summary: Seed database with default configurations
 *     description: Initialize the config collection with default type configurations
 *     tags:
 *       - Configuration
 *     responses:
 *       200:
 *         description: Database seeded successfully
 *       500:
 *         description: Server error
 */
export async function POST(req) {
  try {
    const client = await get_or_create_client();
    const authuser = await get_name_authuser() || "system";

    if (client == null) {
      return new NextResponse(JSON.stringify({ error: "Failed to connect to database" }), { status: 500 });
    }

    const dbname = await get_database_user();
    const db = client.db(dbname);
    const configs = db.collection("config");

    const results = [];

    for (const [configType, data] of Object.entries(DEFAULT_CONFIGS)) {
      // Check if config already exists
      const existingConfig = await configs.findOne({ type: configType });
      
      if (!existingConfig) {
        const configData = {
          type: configType,
          data: data,
          version: 1,
          lastModified: new Date().toISOString(),
          modifiedBy: authuser,
          isDefault: true
        };

        const result = await configs.insertOne(configData);
        results.push({ type: configType, created: !!result.insertedId });
      } else {
        results.push({ type: configType, created: false, message: "Already exists" });
      }
    }

    return NextResponse.json({ 
      message: "Seeding completed", 
      results: results 
    });

  } catch (error) {
    console.error('Config seed error:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { get_database_user } from "@/app/api/utils/get_database_user";
import { analyzeTraitConversion } from "@/utils/unitConversion";

/**
 * @swagger
 * /api/traits/convert-units/preview:
 *   post:
 *     summary: Preview trait unit conversions without applying changes
 *     description: |
 *       Analyzes which traits would be converted and returns preview data
 *       without modifying the database. Shows the first 10 conversions that would be applied.
 *     tags:
 *       - Traits
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               traitIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional array of trait IDs to preview. If not provided, previews all traits.
 *     responses:
 *       200:
 *         description: Successfully generated preview
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalTraits:
 *                   type: number
 *                 willConvert:
 *                   type: number
 *                 willSkip:
 *                   type: number
 *                 preview:
 *                   type: array
 *                   description: First 10 conversions that will be applied
 *                   items:
 *                     type: object
 */
export async function POST(request) {
  let client;
  
  try {
    client = await get_or_create_client();
    const dbname = await get_database_user();
    const db = client.db(dbname);
    
    const body = await request.json();
    const { traitIds } = body || {};

    // Get trait types configuration to know default units
    const configCollection = db.collection("config");
    const traitTypesConfig = await configCollection.findOne({ type: "traittypes" });
    
    if (!traitTypesConfig || !traitTypesConfig.data) {
      return NextResponse.json(
        { error: "Trait types configuration not found" },
        { status: 500 }
      );
    }

    // Get base units configuration
    const baseUnitsConfig = await configCollection.findOne({ type: "baseunits" });
    const baseUnits = baseUnitsConfig?.data || null;

    const traitsCollection = db.collection("traits");
    
    // Build query: either specific traits or all traits
    const query = traitIds && traitIds.length > 0
      ? { _id: { $in: traitIds.map(id => new ObjectId(id)) } }
      : {};

    const traits = await traitsCollection.find(query).toArray();

    const results = {
      totalTraits: traits.length,
      willConvert: 0,
      willSkip: 0,
      preview: []
    };

    // Analyze each trait
    for (const trait of traits) {
      const analysis = analyzeTraitConversion(trait, traitTypesConfig.data, baseUnits);
      
      if (analysis.needsConversion && analysis.newValue !== null) {
        results.willConvert++;
        
        // Only add first 10 to preview
        if (results.preview.length < 10) {
          results.preview.push({
            traitId: trait._id.toString(),
            sampleId: trait.sampleId?.toString(),
            type: trait.type,
            oldValue: trait.measurement,
            oldUnit: trait.unit,
            newValue: analysis.newValue,
            newUnit: analysis.newUnit,
            date: trait.date
          });
        }
      } else {
        results.willSkip++;
      }
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error("Error previewing trait unit conversion:", error);
    return NextResponse.json(
      { error: "Failed to preview conversion", details: error.message },
      { status: 500 }
    );
  }
}

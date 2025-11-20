import { get_or_create_client } from "@/app/api/utils/mongodbClient";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { get_database_user } from "@/app/api/utils/get_database_user";
import { 
  analyzeTraitConversion,
  convertMeasurement 
} from "@/utils/unitConversion";

/**
 * @swagger
 * /api/traits/convert-units:
 *   post:
 *     summary: Convert traits to their default units
 *     description: |
 *       Converts trait measurements to their default units based on SI prefix conversion.
 *       Can convert specific traits by ID or all traits in the database.
 *       Only converts traits where the current unit is compatible with the default unit
 *       (i.e., same base unit with different SI prefix).
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
 *                 description: Optional array of trait IDs to convert. If not provided, converts all traits.
 *                 example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *     responses:
 *       200:
 *         description: Successfully converted traits
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totalTraits:
 *                   type: number
 *                   description: Total number of traits processed
 *                   example: 150
 *                 converted:
 *                   type: number
 *                   description: Number of traits successfully converted
 *                   example: 45
 *                 skipped:
 *                   type: number
 *                   description: Number of traits skipped (already in default unit or incompatible)
 *                   example: 105
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       traitId:
 *                         type: string
 *                       type:
 *                         type: string
 *                       converted:
 *                         type: boolean
 *                       oldValue:
 *                         type: number
 *                       oldUnit:
 *                         type: string
 *                       newValue:
 *                         type: number
 *                       newUnit:
 *                         type: string
 *                       reason:
 *                         type: string
 *       500:
 *         description: Database or conversion error
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
      success: true,
      totalTraits: traits.length,
      converted: 0,
      skipped: 0,
      details: []
    };

    // Process each trait
    for (const trait of traits) {
      const analysis = analyzeTraitConversion(trait, traitTypesConfig.data, baseUnits);
      
      const detail = {
        traitId: trait._id.toString(),
        type: trait.type,
        converted: analysis.needsConversion,
        oldValue: trait.measurement,
        oldUnit: trait.unit,
        newValue: analysis.newValue,
        newUnit: analysis.newUnit,
        reason: analysis.reason
      };

      if (analysis.needsConversion && analysis.newValue !== null) {
        // Update the trait in the database
        const updateResult = await traitsCollection.updateOne(
          { _id: trait._id },
          {
            $set: {
              measurement: analysis.newValue,
              unit: analysis.newUnit,
              recentChangeDate: new Date().toISOString()
            },
            $push: {
              logbook: `${new Date().toISOString()}: Unit converted from ${trait.unit} to ${analysis.newUnit} (${trait.measurement} → ${analysis.newValue})`
            }
          }
        );

        if (updateResult.modifiedCount > 0) {
          results.converted++;
        }
      } else {
        results.skipped++;
      }

      results.details.push(detail);
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error("Error converting trait units:", error);
    return NextResponse.json(
      { error: "Failed to convert trait units", details: error.message },
      { status: 500 }
    );
  }
}

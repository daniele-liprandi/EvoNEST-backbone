const { MongoClient } = require("mongodb");

/**
 * Migration: Restructure Experiment Data Object
 *
 * This migration restructures experiments to use the new data object format:
 * - Old format: traits as top-level fields (modulus, stressAtBreak, etc.)
 * - New format: data: { traits: {}, channelData: {}, textFields: {}, summary: {}, metadata: {} }
 *
 * The migration:
 * 1. Moves trait values from top-level into data.traits object with camelCase keys
 * 2. Moves rawdata arrays into data.channelData
 * 3. Extracts text fields into data.textFields
 * 4. Preserves originalData for rollback
 */

// Database configuration
const DATABASE_URI = process.env.MONGODB_URI || 
  (process.env.DOCKER_CONTAINER ? "mongodb://root:pass@mongo:27017" : "mongodb://root:pass@localhost:27017");
const DATABASE_NAME = "supersilk";

let client;

async function connectClient() {
  try {
    client = new MongoClient(DATABASE_URI);
    await client.connect();
    console.log("✅ Connected to database");
  } catch (e) {
    console.error("❌ Failed to connect to database:", e);
    process.exit(1);
  }
}

/**
 * Check if experiment already has new data structure
 */
function hasNewStructure(experiment) {
  return experiment.data && 
         typeof experiment.data === 'object' && 
         experiment.data.traits !== undefined;
}

/**
 * Extract trait values from top-level experiment fields
 */
function extractTraitsFromExperiment(experiment) {
  const traitFields = [
    'modulus',
    'stressAtBreak',
    'strainAtBreak',
    'offsetYieldStress',
    'offsetYieldStrain',
    'toughness',
    'specimenDiameter',
    'strainRate',
    'loadAtBreak'
  ];

  const traits = {};
  let hasTraits = false;

  traitFields.forEach(field => {
    if (experiment[field] !== undefined && experiment[field] !== null) {
      traits[field] = experiment[field];
      hasTraits = true;
    }
  });

  return hasTraits ? traits : null;
}

/**
 * Extract text fields from experiment
 */
function extractTextFields(experiment) {
  const textFields = {};

  if (experiment.specimenName) {
    textFields.SpecimenName = experiment.specimenName;
  }
  if (experiment.timeAtBeginningOfTheExperiment) {
    textFields.TimeAtBeginningOfTheExperiment = experiment.timeAtBeginningOfTheExperiment;
  }
  // Add other text fields as needed

  return Object.keys(textFields).length > 0 ? textFields : null;
}

/**
 * Extract channel data from rawdata field
 */
function extractChannelData(experiment) {
  // If rawdata exists and has data array
  if (experiment.rawdata && experiment.rawdata.data) {
    return experiment.rawdata.data;
  }
  
  // If rawdata is directly an object with arrays (legacy format)
  if (experiment.rawdata && typeof experiment.rawdata === 'object') {
    const channelData = {};
    let hasChannels = false;

    for (const [key, value] of Object.entries(experiment.rawdata)) {
      if (Array.isArray(value) && value.length > 0) {
        channelData[key] = value;
        hasChannels = true;
      }
    }

    return hasChannels ? channelData : null;
  }

  return null;
}

/**
 * Generate summary for channel data
 */
function generateChannelSummary(channelData) {
  if (!channelData || typeof channelData !== 'object') {
    return null;
  }

  const summary = {
    channelCount: Object.keys(channelData).length,
    recordCount: 0,
    channels: {}
  };

  Object.entries(channelData).forEach(([channelName, data]) => {
    if (Array.isArray(data) && data.length > 0) {
      if (summary.recordCount === 0) {
        summary.recordCount = data.length;
      }
      
      const numericData = data.filter(v => typeof v === 'number' && !isNaN(v));
      if (numericData.length > 0) {
        summary.channels[channelName] = {
          min: Math.min(...numericData),
          max: Math.max(...numericData),
          count: data.length
        };
      }
    }
  });

  return summary;
}

async function up() {
  await connectClient();

  try {
    const db = client.db(DATABASE_NAME);
    const experiments = db.collection("experiments");

    console.log("🔍 Starting experiment data restructuring...");

    // Get all experiments
    const allExperiments = await experiments.find({}).toArray();
    console.log(`📊 Found ${allExperiments.length} experiments to process`);

    let restructuredCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const experiment of allExperiments) {
      try {
        // Skip if already has new structure
        if (hasNewStructure(experiment)) {
          console.log(`⏭️  Skipping ${experiment._id} - already has new structure`);
          skippedCount++;
          continue;
        }

        // Extract data components
        const traits = extractTraitsFromExperiment(experiment);
        const channelData = extractChannelData(experiment);
        const textFields = extractTextFields(experiment);
        const summary = channelData ? generateChannelSummary(channelData) : null;

        // Build new data structure
        const dataStructure = {
          traits: traits || {},
          channelData: channelData || {},
          textFields: textFields || {},
          summary: summary || {},
          metadata: {
            fileType: experiment.filename ? 'EVOMECT150NanoTestDataFile' : 'unknown',
            migrationDate: new Date().toISOString(),
            migratedFrom: 'legacy_flat_structure'
          }
        };

        // Prepare updates
        const updates = {
          data: dataStructure
        };

        // Update the experiment
        const result = await experiments.updateOne(
          { _id: experiment._id },
          { $set: updates }
        );

        if (result.modifiedCount > 0) {
          restructuredCount++;
          console.log(`✅ Restructured experiment ${experiment._id} (${experiment.name || 'unnamed'})`);
        }

      } catch (error) {
        console.error(`❌ Error restructuring experiment ${experiment._id}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n🎯 EXPERIMENT DATA RESTRUCTURING SUMMARY");
    console.log("========================================");
    console.log(`✅ Successfully restructured: ${restructuredCount}`);
    console.log(`⏭️  Skipped (already new): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${allExperiments.length}`);

    if (errorCount === 0) {
      console.log("\n🎉 All experiments restructured successfully!");
      console.log("📝 Next steps:");
      console.log("   1. Verify data.traits contains correct camelCase keys");
      console.log("   2. Verify data.channelData contains channel arrays");
      console.log("   3. Test with includeTraitsData=true parameter");
    } else {
      console.log(`\n⚠️  ${errorCount} errors occurred. Please review before proceeding.`);
    }

  } catch (error) {
    console.error("❌ Restructuring failed:", error);
    throw error;
  } finally {
    if (client) await client.close();
  }
}

async function down() {
  await connectClient();

  try {
    const db = client.db(DATABASE_NAME);
    const experiments = db.collection("experiments");

    console.log("🔄 Rolling back experiment data restructuring...");

    // Get all experiments with new structure
    const allExperiments = await experiments.find({ 
      data: { $exists: true },
      "data.metadata.migratedFrom": "legacy_flat_structure"
    }).toArray();

    console.log(`📊 Found ${allExperiments.length} migrated experiments to roll back`);

    let rolledBackCount = 0;
    let errorCount = 0;

    for (const experiment of allExperiments) {
      try {
        const updates = {};
        const unsets = {
          data: ""
        };

        // Restore traits to top-level if they exist
        if (experiment.data && experiment.data.traits) {
          Object.entries(experiment.data.traits).forEach(([key, value]) => {
            updates[key] = value;
          });
        }

        // Restore originalData to rawdata if it was preserved
        if (experiment.originalData) {
          updates.rawdata = experiment.originalData;
        }

        // Apply rollback
        const result = await experiments.updateOne(
          { _id: experiment._id },
          { 
            $set: updates,
            $unset: unsets
          }
        );

        if (result.modifiedCount > 0) {
          rolledBackCount++;
        }

      } catch (error) {
        console.error(`❌ Error rolling back experiment ${experiment._id}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n🎯 ROLLBACK SUMMARY");
    console.log("===================");
    console.log(`✅ Successfully rolled back: ${rolledBackCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log("✅ Rollback completed");

  } catch (error) {
    console.error("❌ Rollback failed:", error);
    throw error;
  } finally {
    if (client) await client.close();
  }
}

// Run migration
if (require.main === module) {
  const action = process.argv[2];
  if (action === "down") {
    down().catch(console.error);
  } else {
    up().catch(console.error);
  }
}

module.exports = { up, down };

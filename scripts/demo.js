//scripts/demo-reset.js
// How to use this script:
// 1. Run `node scripts/demo-reset.js reset` to reset the database and clean storage.
// 2. Run `node scripts/demo-reset.js start` to start the cron job for periodic resets.
// 3. Run `node scripts/demo-reset.js clean` to clean the storage directory only.
// 4. Run `node scripts/demo-reset.js seed` to reset the database with demo data only.


const { MongoClient, ObjectId } = require("mongodb");
const fs = require("fs").promises;
const path = require("path");
const cron = require("node-cron");

// Configuration - using your actual environment variables
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const STORAGE_PATH = process.env.STORAGE_PATH || "/usr/evonest/file_storage";

// Demo data structure matching your actual schemas
const DEMO_DATA = {
  users: [
    {
      _id: "65f1111111111111111111111",
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@university.edu",
      role: "researcher",
      department: "Biomechanics Lab",
      databases: ["admin"],
      activeDatabase: "admin",
    },
    {
      _id: "65f2222222222222222222222",
      name: "Prof. Michael Chen",
      email: "chen@bio.university.edu",
      role: "supervisor",
      department: "Evolutionary Biology",
      databases: ["admin"],
      activeDatabase: "admin",
    },
    {
      _id: "65f3333333333333333333333",
      name: "Alex Rodriguez",
      email: "alex.r@fieldstation.org",
      role: "field_collector",
      department: "Field Station",
      databases: ["admin"],
      activeDatabase: "admin",
    },
  ],

  // 3 animals + 1 plant - matching your Sample schema
  specimens: [
    {
      _id: "65a1111111111111111111111",
      name: "PANTH_001",
      family: "Felidae",
      genus: "Panthera",
      species: "leo",
      type: "animal",
      responsible:  "65f1111111111111111111111",
      date: "2024-03-15",
      location: "Kruger National Park",
      lat: -24.996,
      lon: 31.555,
      sex: "M",
      box: "A1",
      slot: "001",
      notes: "African Lion specimen for biomechanical analysis",
      recentChangeDate: new Date().toISOString(),
      logbook: [[new Date().toISOString(), "Created demo sample PANTH_001"]],
    },
    {
      _id: "65a2222222222222222222222",
      name: "CANIS_001",
      family: "Canidae",
      genus: "Canis",
      species: "lupus",
      type: "animal",
      responsible:  "65f2222222222222222222222",
      date: "2024-02-20",
      location: "Yellowstone National Park",
      lat: 44.428,
      lon: -110.588,
      sex: "F",
      box: "B2",
      slot: "002",
      notes: "Gray Wolf specimen from Yellowstone",
      recentChangeDate: new Date().toISOString(),
      logbook: [[new Date().toISOString(), "Created demo sample CANIS_001"]],
    },
    {
      _id: "65a3333333333333333333333",
      name: "URSUS_001",
      family: "Ursidae",
      genus: "Ursus",
      species: "americanus",
      type: "animal",
      responsible:  "65f3333333333333333333333",
      date: "2024-01-10",
      location: "Great Smoky Mountains",
      lat: 35.611,
      lon: -83.489,
      sex: "M",
      box: "C3",
      slot: "003",
      notes: "Black Bear specimen for comparative study",
      recentChangeDate: new Date().toISOString(),
      logbook: [[new Date().toISOString(), "Created demo sample URSUS_001"]],
    },
    {
      _id: "65a4444444444444444444444",
      name: "QUERC_001",
      family: "Fagaceae",
      genus: "Quercus",
      species: "robur",
      type: "plant", // Using 'plant' type now
      responsible:  "65f1111111111111111111111",
      date: "2024-04-05",
      location: "University Botanical Garden",
      lat: 52.52,
      lon: 13.405,
      box: "D4",
      slot: "004",
      notes: "English Oak sample for wood analysis",
      recentChangeDate: new Date().toISOString(),
      logbook: [[new Date().toISOString(), "Created demo sample QUERC_001"]],
    },
  ],

  // 2 subsamples each (8 total) - matching your subsample structure
  subsamples: [
    // Lion subsamples
    {
      _id: "65b1111111111111111111111",
      name: "PANTH_001_01",
      family: "Felidae",
      genus: "Panthera",
      species: "leo",
      type: "tissue", // Using proper sample type
      parentId:  "65a1111111111111111111111",
      responsible:  "65f1111111111111111111111",
      date: "2024-03-16",
      location: "Kruger National Park",
      box: "A1",
      slot: "001a",
      subsampletype: "muscle",
      notes: "Skeletal muscle sample from hindlimb",
      recentChangeDate: new Date().toISOString(),
      logbook: [
        [new Date().toISOString(), "Created demo subsample PANTH_001_01"],
      ],
    },
    {
      _id: "65b1111111111111111111112",
      name: "PANTH_001_02",
      family: "Felidae",
      genus: "Panthera",
      species: "leo",
      type: "tissue",
      parentId:  "65a1111111111111111111111",
      responsible:  "65f1111111111111111111111",
      date: "2024-03-16",
      location: "Kruger National Park",
      box: "A1",
      slot: "001b",
      subsampletype: "bone",
      notes: "Femur bone section",
      recentChangeDate: new Date().toISOString(),
      logbook: [
        [new Date().toISOString(), "Created demo subsample PANTH_001_02"],
      ],
    },
    // Wolf subsamples
    {
      _id: "65b2222222222222222222221",
      name: "CANIS_001_01",
      family: "Canidae",
      genus: "Canis",
      species: "lupus",
      type: "tissue",
      parentId:  "65a2222222222222222222222",
      responsible:  "65f2222222222222222222222",
      date: "2024-02-21",
      location: "Yellowstone National Park",
      box: "B2",
      slot: "002a",
      subsampletype: "muscle",
      notes: "Heart muscle tissue sample",
      recentChangeDate: new Date().toISOString(),
      logbook: [
        [new Date().toISOString(), "Created demo subsample CANIS_001_01"],
      ],
    },
    {
      _id: "65b2222222222222222222222",
      name: "CANIS_001_02",
      family: "Canidae",
      genus: "Canis",
      species: "lupus",
      type: "tissue",
      parentId:  "65a2222222222222222222222",
      responsible:  "65f2222222222222222222222",
      date: "2024-02-21",
      location: "Yellowstone National Park",
      box: "B2",
      slot: "002b",
      subsampletype: "bone",
      notes: "Cranial bone sample",
      recentChangeDate: new Date().toISOString(),
      logbook: [
        [new Date().toISOString(), "Created demo subsample CANIS_001_02"],
      ],
    },
    // Bear subsamples
    {
      _id: "65b3333333333333333333331",
      name: "URSUS_001_01",
      family: "Ursidae",
      genus: "Ursus",
      species: "americanus",
      type: "tissue",
      parentId: "65a3333333333333333333333",
      responsible: "65f3333333333333333333333",
      date: "2024-01-11",
      location: "Great Smoky Mountains",
      box: "C3",
      slot: "003a",
      subsampletype: "muscle",
      notes: "Gastrocnemius muscle sample",
      recentChangeDate: new Date().toISOString(),
      logbook: [
        [new Date().toISOString(), "Created demo subsample URSUS_001_01"],
      ],
    },
    {
      _id: "65b3333333333333333333332",
      name: "URSUS_001_02",
      family: "Ursidae",
      genus: "Ursus",
      species: "americanus",
      type: "tissue",
      parentId: "65a3333333333333333333333",
      responsible: "65f3333333333333333333333",
      date: "2024-01-11",
      location: "Great Smoky Mountains",
      box: "C3",
      slot: "003b",
      subsampletype: "bone",
      notes: "Lumbar vertebra sample",
      recentChangeDate: new Date().toISOString(),
      logbook: [
        [new Date().toISOString(), "Created demo subsample URSUS_001_02"],
      ],
    },
    // Oak subsamples
    {
      _id: "65b4444444444444444444441",
      name: "QUERC_001_01",
      family: "Fagaceae",
      genus: "Quercus",
      species: "robur",
      type: "tissue",
      parentId: "65a4444444444444444444444",
      responsible: "65f1111111111111111111111",
      date: "2024-04-06",
      location: "University Botanical Garden",
      box: "D4",
      slot: "004a",
      subsampletype: "leaf",
      notes: "Mature leaf sample for analysis",
      recentChangeDate: new Date().toISOString(),
      logbook: [
        [new Date().toISOString(), "Created demo subsample QUERC_001_01"],
      ],
    },
    {
      _id: "65b4444444444444444444442",
      name: "QUERC_001_02",
      family: "Fagaceae",
      genus: "Quercus",
      species: "robur",
      type: "tissue",
      parentId: "65a4444444444444444444444",
      responsible: "65f1111111111111111111111",
      date: "2024-04-06",
      location: "University Botanical Garden",
      box: "D4",
      slot: "004b",
      subsampletype: "bark",
      notes: "Outer bark tissue sample",
      recentChangeDate: new Date().toISOString(),
      logbook: [
        [new Date().toISOString(), "Created demo subsample QUERC_001_02"],
      ],
    },
  ],
};

// Trait types based on your schema - realistic mappings to subsample types
const DEMO_TRAITS = [
  // Muscle tissue traits
  {
    type: "fiber_diameter",
    applicableSubsampleTypes: ["muscle"],
    baseValue: 25.5,
    unit: "μm",
  },
  {
    type: "tensile_strength",
    applicableSubsampleTypes: ["muscle"],
    baseValue: 2.8,
    unit: "MPa",
  },
  // Bone tissue traits
  {
    type: "bone_density",
    applicableSubsampleTypes: ["bone"],
    baseValue: 1.85,
    unit: "g/cm³",
  },
  {
    type: "cortical_thickness",
    applicableSubsampleTypes: ["bone"],
    baseValue: 3.2,
    unit: "mm",
  },
  // Leaf tissue traits
  {
    type: "leaf_area",
    applicableSubsampleTypes: ["leaf"],
    baseValue: 25.5,
    unit: "cm²",
  },
  {
    type: "chlorophyll_content",
    applicableSubsampleTypes: ["leaf"],
    baseValue: 2.4,
    unit: "mg/g",
  },
  // Bark tissue traits
  {
    type: "wood_density",
    applicableSubsampleTypes: ["bark"],
    baseValue: 0.65,
    unit: "g/cm³",
  },
  {
    type: "bark_thickness",
    applicableSubsampleTypes: ["bark"],
    baseValue: 4.8,
    unit: "mm",
  },
];

// Generate trait entries matching your Trait schema
function generateTraitEntries() {
  const entries = [];

  DEMO_TRAITS.forEach((traitType) => {
    // Find samples that match this trait's applicable subsample types
    const applicableSamples = DEMO_DATA.subsamples.filter((sample) =>
      traitType.applicableSubsampleTypes.includes(sample.subsampletype)
    );

    applicableSamples.forEach((sample) => {
      // Generate 5 entries per trait-sample combination
      for (let i = 1; i <= 5; i++) {
        const measurements = generateMeasurementValues(traitType.baseValue, 5);
        const avgMeasurement =
          measurements.reduce((a, b) => a + b, 0) / measurements.length;
        const std = Math.sqrt(
          measurements.reduce(
            (sq, n) => sq + Math.pow(n - avgMeasurement, 2),
            0
          ) / measurements.length
        );

        entries.push({
          _id: new ObjectId(),
          type: traitType.type,
          measurement: Math.round(avgMeasurement * 100) / 100,
          std: Math.round(std * 100) / 100,
          unit: traitType.unit,
          sampleId: sample._id,
          responsible: sample.responsible,
          date: new Date(
            2024,
            Math.floor(Math.random() * 6),
            Math.floor(Math.random() * 28) + 1
          )
            .toISOString()
            .split("T")[0],
          detail: `${traitType.type} measurement for ${sample.subsampletype}`,
          equipment: "",
          listvals: measurements,
          notes: `Replicate ${i} measurement`,
          filesId: [],
          recentChangeDate: new Date().toISOString(),
          logbook: [
            `${new Date().toISOString()}: Created demo trait measurement`,
          ],
        });
      }
    });
  });

  return entries;
}

// Generate realistic measurement values with variation
function generateMeasurementValues(baseValue, count) {
  const values = [];
  for (let i = 0; i < count; i++) {
    // Add realistic variation (±10%)
    const variation = baseValue * 0.1 * (Math.random() - 0.5) * 2;
    values.push(Math.round((baseValue + variation) * 100) / 100);
  }
  return values;
}

// Clean only the STORAGE_PATH directory
async function cleanStorageDirectory() {
  console.log(`🧹 Cleaning storage directory: ${STORAGE_PATH}`);

  try {
    const exists = await fs
      .access(STORAGE_PATH)
      .then(() => true)
      .catch(() => false);
    if (exists) {
      const files = await fs.readdir(STORAGE_PATH);
      let cleanedCount = 0;

      for (const file of files) {
        // Skip .gitkeep and .gitignore files
        if (file === ".gitkeep" || file === ".gitignore") continue;

        const filePath = path.join(STORAGE_PATH, file);
        const stat = await fs.stat(filePath);

        if (stat.isDirectory()) {
          await fs.rmdir(filePath, { recursive: true });
          cleanedCount++;
        } else {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }
      console.log(`   ✅ Cleaned ${cleanedCount} items from ${STORAGE_PATH}`);
    } else {
      console.log(`   ⚠️  Storage directory ${STORAGE_PATH} does not exist`);
    }
  } catch (error) {
    console.log(`   ❌ Could not clean ${STORAGE_PATH}: ${error.message}`);
  }
}

// Reset database with demo data - matching your database structure
async function resetDatabase() {
  console.log("🗄️  Resetting database...");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();

    // Clear existing data from all relevant databases
    console.log("   🗑️  Dropping existing collections...");

    // Users database except for admin user
    const usersDb = client.db("usersdb");
    try {
      // drop everything except the admin user
      resultuserdeletion = await usersDb.collection("users").deleteMany({
        name: { $ne: "admin" },
      });
      console.log(`   🗑️  Deleted ${resultuserdeletion.deletedCount} non-admin users`);
    } catch (error) {
      // Ignore if collection doesn't exist
    }

    // Main database (assuming it's determined by your get_database_user function)
    // For demo purposes, we'll use a default database name
    const mainDbName = process.env.DEMO_DB_NAME || "admin";
    const mainDb = client.db(mainDbName);

    try {
      await mainDb.collection("samples").drop();
      await mainDb.collection("traits").drop();
    } catch (error) {
      // Ignore if collections don't exist
    }

    // Insert users into usersdb
    console.log("   👥 Creating users...");
    await usersDb.collection("users").insertMany(DEMO_DATA.users);

    // Insert specimens and subsamples into main database
    console.log("   🦁 Creating specimens...");
    await mainDb.collection("samples").insertMany(DEMO_DATA.specimens);

    console.log("   🧪 Creating subsamples...");
    await mainDb.collection("samples").insertMany(DEMO_DATA.subsamples);

    // Generate and insert trait entries
    console.log("   📊 Creating trait entries...");
    const traitEntries = generateTraitEntries();
    await mainDb.collection("traits").insertMany(traitEntries);

    console.log(`   ✅ Database reset complete!`);
    console.log(`      - ${DEMO_DATA.users.length} users`);
    console.log(
      `      - ${DEMO_DATA.specimens.length} specimens (3 animals, 1 plant)`
    );
    console.log(
      `      - ${DEMO_DATA.subsamples.length} subsamples (2 per specimen)`
    );
    console.log(
      `      - ${traitEntries.length} trait entries (5 per trait type)`
    );
  } catch (error) {
    console.error("❌ Database reset failed:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Main reset function
async function performReset() {
  const startTime = Date.now();
  console.log(`🚀 Starting demo reset at ${new Date().toISOString()}`);
  console.log(`   Storage path: ${STORAGE_PATH}`);
  console.log(`   MongoDB URI: ${MONGODB_URI}`);

  try {
    await cleanStorageDirectory();
    await resetDatabase();

    const duration = Date.now() - startTime;
    console.log(`✅ Demo reset completed successfully in ${duration}ms`);
  } catch (error) {
    console.error("❌ Demo reset failed:", error);
    process.exit(1);
  }
}

// Cron job setup - every 30 minutes
function startCronJob() {
  console.log("⏰ Starting demo reset cron job (every 2 hours)...");

  // Run every 2 hours at minute 0
  // for testing purposes, you can change this to every minute
  // cron.schedule("0 * * * *", () => {
  cron.schedule("0 */2 * * *", () => {
    performReset();
  });

  console.log("✅ Cron job scheduled");
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case "reset":
      performReset();
      break;
    case "start":
    case "cron":
      startCronJob();
      // Keep the process alive
      process.stdin.resume();
      break;
    case "clean":
      cleanStorageDirectory();
      break;
    case "seed":
      resetDatabase();
      break;
    default:
      console.log("Usage:");
      console.log("  node scripts/demo-reset.js reset  - Run reset once");
      console.log("  node scripts/demo-reset.js start  - Start cron job");
      console.log("  node scripts/demo-reset.js clean  - Clean files only");
      console.log("  node scripts/demo-reset.js seed   - Reset database only");
      break;
  }
}

module.exports = {
  performReset,
  cleanStorageDirectory,
  resetDatabase,
  startCronJob,
};
